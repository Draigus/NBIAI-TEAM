"""Import Goals Studio pricing engagement plan into NBI Hub."""
import json
import sys
try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'requests'])
    import requests

BASE = 'http://localhost:8888'
CLIENT_ID = '6975460f-c302-42c5-a586-1d04c5fcb929'

# Login
resp = requests.post(f'{BASE}/api/auth/login', json={'username': 'glen', 'password': 'nbi2026'})
TOKEN = resp.json()['token']
HEADERS = {'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'}

tasks = [
    # Project
    {
        '_temp_id': 'P1',
        'title': 'Goals Studio Pricing Engagement',
        'item_type': 'project',
        'client_id': CLIENT_ID,
        'status': 'In progress',
        'priority': 'High',
        'hours_estimated': 50,
        'description': (
            'Deliver competitive pricing benchmark, regional pricing strategy, and risk assessment '
            'for GOALS F2P football game launching 14 May 2026.\n\n'
            'Budget: 100,000 SEK (~$10K USD) | ~50 billable hours | 5 working days\n'
            'Client: Goals AB (Goals Studio), Stockholm, Sweden\n'
            'Contacts: Jonas Rundberg (CEO), Julius (Live Ops)\n'
            'NBI team: Glen Pryer (relationship + domain), Tom Rieger (contract/President), Devin Rieger (research)\n\n'
            'SOW scope:\n'
            '- Review competitive pricing positioning in sports/football game space\n'
            '- Price point selection, currency pack structure, conversion rate guidance\n'
            '- Regional pricing for base and regional markets\n'
            '- Assessment of current pricing plans against market norms\n'
            '- Recommendations on adjustments and areas of risk\n'
            '- Deliverable: Written summary (12-18 pages) + remote review call\n\n'
            'The game:\n'
            '- F2P football game, launching 14 May 2026 on Steam/Epic/Xbox/PlayStation\n'
            '- Unique generated players (not licensed), RPG progression, aging/retirement\n'
            '- 80% skill / 20% purchased advantage (non-P2W)\n'
            '- No seasons, no battle pass, no wipes\n'
            '- 400K total beta players, 34% D1 retention on PS5 (per Town Hall, pending verification), NPS +24.6, CPI $0.43\n'
            '- World Cup June 2026 = first major monetisation peak\n\n'
            'Architecture: Foundation (map HC economy) > Competitive benchmark > Regional analysis > '
            'Synthesis (recommendations + scenarios) > Deliverable\n\n'
            'Hard deadline: Must deliver before Goals submits pricing to PS/Xbox (9-day review needed before May 14 launch)\n'
            'Key question from Jonas: "Are we pricing too low?"\n'
            'Glen\'s 27-game principle: Launch high, patch down. Never raise prices post-launch.\n'
            'Feature 4 is CONDITIONAL - only delivered if F1-3 complete within budget.'
        ),
    },

    # Feature 1: Competitive HC Pricing Benchmark (16h)
    {
        '_temp_id': 'F1', '_temp_parent_id': 'P1',
        'title': 'F1: Competitive HC Pricing Benchmark',
        'item_type': 'feature', 'client_id': CLIENT_ID,
        'status': 'Not started', 'priority': 'High', 'hours_estimated': 16,
        'description': (
            'Show Goals where they sit relative to the sports/football F2P market. '
            'Extend their existing competitive analysis with insights their internal position doesn\'t give them.\n\n'
            'What NBI adds: Independent cross-genre validation, pricing psychology assessment, '
            'conversion rate benchmarks from NBI 27-game launch history, and the confidence that '
            'an external expert agrees (or disagrees) with their conclusions.\n\n'
            'Budget: 16h (32% of total)'
        ),
    },

    # Story 1.0: Foundation
    {
        '_temp_id': 'S1_0', '_temp_parent_id': 'F1',
        'title': 'S1.0: Foundation - Map the HC Economy',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 4,
        'description': 'Before comparing prices, establish exactly what Goals HC buys and what the player value chain looks like. Prerequisite for everything else.',
    },
    {
        '_temp_id': 'T1_0_1', '_temp_parent_id': 'S1_0',
        'title': 'T1.0.1: Map HC Value Chain',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 2,
        'assignees': ['Glen Pryer'],
        'description': (
            'Document the complete path from real money to in-game value in Goals.\n\n'
            'Key mapping: 1 HC coin = 50 points = $0.012 USD at base rate.\n'
            'Map what each HC tier ACTUALLY buys (380 HC/$5.99 buys 1 National kit with 60 leftover).\n'
            'Map all item categories: National Kits 320 HC, Mech Kits 500 HC, Pulse Kits 820-1100 HC, Celebrations ~580 HC.\n'
            'Identify the "minimum meaningful purchase" - cheapest satisfying thing a new player can buy.\n\n'
            'Sources: GG-Monetization, Pricing Model, player_pricing.md\n\n'
            'Done when: Complete HC value chain documented. Every store item category mapped to HC cost. '
            '"Minimum meaningful purchase" identified and costed.'
        ),
    },
    {
        '_temp_id': 'T1_0_2', '_temp_parent_id': 'S1_0',
        'title': 'T1.0.2: Establish Payer Persona Benchmarks',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 2,
        'assignees': ['Glen Pryer'],
        'description': (
            'Benchmark Goals 3-persona model against industry norms.\n\n'
            'Goals targets: Persona 1 (Core FUT, 20% players, 30% pay, ARPPU $46), '
            'Persona 2 (Dedicated, 35%, 10% pay, ARPPU $15.81), '
            'Persona 3 (Casual, 45%, 2% pay, ARPPU $7.24). '
            'Overall: 10.4% payer rate, ARPU $3.38, ARPPU $32.48.\n\n'
            'Industry benchmarks: Typical F2P payer conversion 2-5% (Goals targets 10.4% - aggressive). '
            'Typical ARPPU $20-$50/month. Whale concentration: top 10% = 50-70% of revenue.\n'
            'Source: NBI portfolio data across 27 F2P launches.\n\n'
            'Seasonless economy implication: No resets/battle pass/FOMO wipes means HC pack ladder '
            'must do ALL conversion work. Compare with eFootball (closer non-seasonal model).\n\n'
            'Done when: Goals payer assumptions benchmarked. Clear assessment of whether conversion/ARPPU '
            'targets are realistic at launch. Implication for pricing strategy documented.'
        ),
    },

    # Story 1.1: Competitive Pricing Position
    {
        '_temp_id': 'S1_1', '_temp_parent_id': 'F1',
        'title': 'S1.1: Competitive Pricing Position',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 7,
        'description': 'Show Goals exactly where their HC pricing sits relative to market - by synthesising their existing competitive data into a clear positioning statement they can\'t write themselves.',
    },
    {
        '_temp_id': 'T1_1_1', '_temp_parent_id': 'S1_1',
        'title': 'T1.1.1: Build Normalised Price Position Map',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 2.5,
        'assignees': ['Glen Pryer'],
        'description': (
            'Create position map showing Goals effective USD/HC against competitive range at each tier.\n\n'
            'At entry ($5-6): Goals = $0.01576/HC. At mid ($20): $0.01454/HC. At top ($100): $0.01290/HC.\n'
            'For each tier: calculate market min, median, max, and Goals percentile.\n'
            'Spot-check 2-3 competitor prices to confirm Goals data is current.\n\n'
            'Source: Goals Pricing Model sheet "Softhard currency comparison".\n\n'
            'Done when: Position map complete. One-line answer: "Goals is at the Xth percentile - '
            '[below/at/above] median."'
        ),
    },
    {
        '_temp_id': 'T1_1_2', '_temp_parent_id': 'S1_1',
        'title': 'T1.1.2: Discount Curve Comparison',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1.5,
        'assignees': ['Glen Pryer'],
        'description': (
            'Compare Goals bonus/discount scaling against competitors.\n\n'
            'Goals curve: Tier 1 0%, Tier 2 ~2.5%, Tier 3 ~7.7%, Tier 4 ~9.4%, Tier 5 ~15.4%, Tier 6 ~18.1%.\n'
            'Competitors: EA FC ~39% max, Fortnite ~24%, Apex ~13%. Goals at ~18%.\n\n'
            'Assessment: Is 18% enough to incentivise whale spending? Is the tier-to-tier jump consistent? '
            'Is there a clear "best value" tier?\n'
            'Key principle: New launches should be MORE conservative on discounts.\n\n'
            'Done when: Curve comparison documented. Recommendation if any tier discount should change.'
        ),
    },
    {
        '_temp_id': 'T1_1_3', '_temp_parent_id': 'S1_1',
        'title': 'T1.1.3: SKU Structure and Entry Point Audit',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 2,
        'assignees': ['Glen Pryer'],
        'description': (
            'Assess 6-tier HC ladder: $5.99/$9.99/$19.99/$29.99/$49.99/$99.99.\n\n'
            'Entry point: Goals $5.99 vs EA FC $0.99, Apex $4.99. Does $5.99 create first-purchase friction?\n'
            'Structural gaps: $9.99 to $19.99 (100% jump), $49.99 to $99.99 (100% jump) - standard in industry.\n'
            'Whale ceiling: $99.99 cap + no purchase limits = whale-friendly without optically aggressive pricing.\n'
            'Counter-argument on low entry tier: $0.99 nets only $0.69 after 30% platform fee.\n\n'
            'Done when: Structure audit complete. Entry point assessment with recommendation. '
            'Whale ceiling analysis documented. Structural gaps identified with recommendation.'
        ),
    },
    {
        '_temp_id': 'T1_1_4', '_temp_parent_id': 'S1_1',
        'title': 'T1.1.4: Platform Fee Impact and Net Revenue Table',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1,
        'assignees': ['Devin Rieger'],
        'description': (
            'Calculate actual net revenue per SKU per platform.\n\n'
            'Build table: SKU | Gross | Steam Net (30%) | Epic Net (12%) | PS/Xbox Net (30%)\n'
            'Epic advantage: Goals earns 40% more per transaction on Epic vs other platforms at same price.\n'
            'Verify alignment with PS wholesale rates in Goals matrix.\n\n'
            'Done when: Net revenue table complete. Margin concerns flagged. Epic advantage quantified.'
        ),
    },

    # Story 1.2: Conversion Rate and Elasticity
    {
        '_temp_id': 'S1_2', '_temp_parent_id': 'F1',
        'title': 'S1.2: Conversion Rate and Elasticity Context',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 3,
        'description': 'Provide conversion/revenue modelling context that turns a static price comparison into actionable strategy.',
    },
    {
        '_temp_id': 'T1_2_1', '_temp_parent_id': 'S1_2',
        'title': 'T1.2.1: Price Elasticity Scenario Modelling',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 3,
        'assignees': ['Glen Pryer'],
        'description': (
            'Model 4 scenarios using Goals revenue model (805,250 MAU, 10.4% payer rate, $32.48 ARPPU = $2.72M).\n\n'
            'Scenario A: Raise all prices 10% (conversion drops 5-15%).\n'
            'Scenario B: Raise all prices 20% (conversion drops 10-25%).\n'
            'Scenario C: Raise entry tier only $5.99 to $6.99 (entry conversion drops 5-10%).\n'
            'Scenario D: Keep prices, steepen discount curve to 25% max.\n\n'
            'Present as impact ranges (conservative/optimistic), not point estimates.\n'
            'Key insight: If 10.4% conversion is optimistic for month 1, lowering prices won\'t help. '
            'Launch high, patch down.\n\n'
            'Done when: 4 scenarios modelled with revenue impact ranges. Clear recommendation on '
            'which scenario maximises launch revenue while preserving future flexibility.'
        ),
    },

    # Story 1.3: Promotional/First-Purchase
    {
        '_temp_id': 'S1_3', '_temp_parent_id': 'F1',
        'title': 'S1.3: Promotional and First-Purchase Pricing',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 2,
        'description': 'Address gap in static HC pack analysis. First-purchase incentives and promotional pricing drive early conversion.',
    },
    {
        '_temp_id': 'T1_3_1', '_temp_parent_id': 'S1_3',
        'title': 'T1.3.1: First-Purchase and Starter Pack Recommendations',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 2,
        'assignees': ['Glen Pryer'],
        'description': (
            'Recommend complementary offers that improve conversion on core HC ladder:\n\n'
            '1. First Purchase Bonus: Double HC on first-ever purchase (industry standard, '
            'improves conversion from 2% to 4-6% in first 30 days). Zero revenue cost.\n'
            '2. Limited Starter Pack: One-time $3.99 offer (500 HC + Rare+ player + exclusive kit). '
            'Breaks first-purchase barrier.\n'
            '3. World Cup Launch Bundle: Tied to June event, limited availability, higher value/dollar.\n\n'
            'Frame as complementary to core pricing (not scope creep).\n\n'
            'Done when: 2-3 specific recommendations with rationale and expected conversion impact.'
        ),
    },

    # Feature 2: Regional Pricing Strategy (13h)
    {
        '_temp_id': 'F2', '_temp_parent_id': 'P1',
        'title': 'F2: Regional Pricing Strategy',
        'item_type': 'feature', 'client_id': CLIENT_ID,
        'status': 'Not started', 'priority': 'High', 'hours_estimated': 13,
        'description': (
            'Validate Goals 40+ country pricing matrix. NBI adds: competitive regional context, '
            'PPP-adjusted analysis, and platform compliance verification they can\'t get from their own spreadsheet.\n\n'
            'What NBI adds: Goals built their matrix using exchange rates and some PPP data. They CANNOT '
            'benchmark their regional pricing against what EA FC actually charges in Turkey or Brazil. '
            'NBI provides this.\n\n'
            'Budget: 13h (26% of total)'
        ),
    },

    # Story 2.1: Regional Deviation
    {
        '_temp_id': 'S2_1', '_temp_parent_id': 'F2',
        'title': 'S2.1: Regional Deviation and Risk Identification',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 6.5,
        'description': 'Flag countries where Goals pricing creates material risk (too high = player backlash, too low = revenue leakage, misaligned = platform rejection).',
    },
    {
        '_temp_id': 'T2_1_1', '_temp_parent_id': 'S2_1',
        'title': 'T2.1.1: Categorise All Countries by Risk Level',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 3,
        'assignees': ['Devin Rieger'],
        'description': (
            'Apply NBI risk framework to all countries in Goals matrix:\n'
            'Green: Deviation <15% from FX AND aligned with platform norms.\n'
            'Amber: Deviation 15-25% OR misaligned with one factor.\n'
            'Red: Deviation >25% OR multiple risk factors OR large player market with >15% over-pricing.\n\n'
            'Red candidates: Poland (+25%), Switzerland (+26%), Ukraine (-26%), Turkey, Brazil.\n'
            'Amber candidates: South Africa, Czech Republic, Norway, Denmark.\n'
            'EUR zone: Same price across all EUR countries but PPP varies significantly.\n\n'
            'Cross-reference with beta data: UK 1,274, France 1,026, Turkey 667, Brazil 495, Poland 392.\n\n'
            'Done when: Every country categorised (green/amber/red). Red countries have specific risk descriptions. '
            'Output is a ranked priority list for deeper analysis.'
        ),
    },
    {
        '_temp_id': 'T2_1_2', '_temp_parent_id': 'S2_1',
        'title': 'T2.1.2: Competitor Regional Pricing for Red/Amber Markets',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 3.5,
        'assignees': ['Devin Rieger'],
        'description': (
            'Research EA FC and Fortnite pricing in 5-10 red/amber countries.\n\n'
            'Sources: PS Store regional web store, SteamDB, Epic Games Store.\n'
            'For each market: Country | Goals proposed | EA FC actual | Fortnite actual | Market median | Position.\n\n'
            'Priority markets: Brazil (large, low PPP, WC critical), Turkey (5th largest beta community, '
            'extreme PPP), Poland (large beta, +25% above FX), Russia/CIS (currency volatility).\n\n'
            'SCHEDULE RISK: May take up to 5h if stores region-locked. Fallback: SteamDB for Steam, '
            'third-party sources for PS/Xbox. Overrun absorbed from F4 budget.\n\n'
            'Done when: Competitor pricing gathered for all red/amber countries. Goals position vs EA FC documented.'
        ),
    },

    # Story 2.2: Platform Compliance
    {
        '_temp_id': 'S2_2', '_temp_parent_id': 'F2',
        'title': 'S2.2: Platform Compliance and Submission Guidance',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1.5,
        'description': 'Ensure Goals pricing will pass PS/Xbox review without rejection or delay.',
    },
    {
        '_temp_id': 'T2_2_1', '_temp_parent_id': 'S2_2',
        'title': 'T2.2.1: Verify Platform Tier Compliance',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1.5,
        'assignees': ['Glen Pryer'],
        'description': (
            'Cross-reference Goals proposed prices against valid PS/Xbox tier selections.\n'
            'Sources: Goals "Copy of PS4_PS5 Digital" sheet, "Xbox wholesale pricing" sheet.\n'
            'Flag any non-standard tier prices (Sony/Xbox will reject).\n\n'
            'Submission checklist: valid tiers, all territories covered, USD fallback for unsupported currencies.\n'
            'Timeline: deliver by 27 April > Goals submits by 5 May > 9-day review > 14 May launch.\n'
            'Ask Julius: has a test pricing configuration been submitted?\n\n'
            'Done when: Platform compliance verified or issues flagged. Submission timeline documented.'
        ),
    },

    # Story 2.3: Country Recommendations
    {
        '_temp_id': 'S2_3', '_temp_parent_id': 'F2',
        'title': 'S2.3: Country-Specific Recommendations',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 3,
        'description': 'Provide specific price adjustment recommendations for each red/amber country.',
    },
    {
        '_temp_id': 'T2_3_1', '_temp_parent_id': 'S2_3',
        'title': 'T2.3.1: Write Country Recommendation Cards',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 3,
        'assignees': ['Glen Pryer'],
        'description': (
            'For each red/amber country, write a recommendation card:\n'
            'Country | Current proposed price | Issue | Recommended price | Rationale | Revenue impact | Risk if unchanged.\n\n'
            'Prioritise by: player base size x deviation severity.\n'
            'Group by action: "Reduce price" / "Can increase" / "Platform tier adjustment".\n'
            'Expected output: 8-12 country cards.\n\n'
            'Each card must be self-contained - Julius can implement without reading the full report.\n\n'
            'Done when: All red/amber countries have specific, actionable recommendation cards.'
        ),
    },

    # Feature 3: Risk Assessment (10h)
    {
        '_temp_id': 'F3', '_temp_parent_id': 'P1',
        'title': 'F3: Risk Assessment, Scenarios and Recommendations',
        'item_type': 'feature', 'client_id': CLIENT_ID,
        'status': 'Not started', 'priority': 'High', 'hours_estimated': 10,
        'description': (
            'Synthesise all analysis into clear, specific, actionable guidance with modelled impact.\n\n'
            'Budget: 10h (20% of total)'
        ),
    },

    # Story 3.1
    {
        '_temp_id': 'S3_1', '_temp_parent_id': 'F3',
        'title': 'S3.1: Are We Too Low? - The Central Answer',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1.5,
        'description': "Directly address Jonas's core concern with evidence.",
    },
    {
        '_temp_id': 'T3_1_1', '_temp_parent_id': 'S3_1',
        'title': 'T3.1.1: Build the Definitive Position Statement',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1.5,
        'assignees': ['Glen Pryer'],
        'description': (
            'Synthesise competitive position (T1.1.1), payer benchmarks (T1.0.2), and scenario modelling (T1.2.1) '
            'into one clear paragraph answering "are we too low?"\n\n'
            'Format: "Goals base HC pricing is at the Xth percentile... This means... Given your 80/20 positioning, '
            'this is [appropriate/low/high] because... Your payer conversion target of 10.4% is [realistic/aggressive] '
            'for month 1... Our recommendation is [specific]."\n\n'
            'Take a position. No hedging. Reference: launch high, patch down.\n\n'
            'Done when: One clear paragraph with specific evidence and specific recommendation.'
        ),
    },

    # Story 3.2
    {
        '_temp_id': 'S3_2', '_temp_parent_id': 'F3',
        'title': 'S3.2: Risk Register',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 2,
        'description': 'Document all identified pricing risks before launch, ranked by severity.',
    },
    {
        '_temp_id': 'T3_2_1', '_temp_parent_id': 'S3_2',
        'title': 'T3.2.1: Compile and Rank Risks',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 2,
        'assignees': ['Glen Pryer'],
        'description': (
            'Minimum 7 risks with Description | Severity | Likelihood | Markets Affected | Mitigation:\n\n'
            '1. P2W perception at high price points (Critical/Medium)\n'
            '2. Post-launch price increase impossibility (High/Medium)\n'
            '3. Over-pricing in price-sensitive markets - Turkey, Brazil, Poland (High/High)\n'
            '4. Platform pricing rejection (Critical/Low)\n'
            '5. Discount curve too shallow for launch (Medium/Medium)\n'
            '6. Missing entry-tier conversion at $5.99 (Medium/Medium)\n'
            '7. Originals/Celebrity pack pricing gap (Low/N/A)\n\n'
            'Done when: All risks documented. Ranked by severity x likelihood. Top 3 have specific mitigations.'
        ),
    },

    # Story 3.3
    {
        '_temp_id': 'S3_3', '_temp_parent_id': 'F3',
        'title': 'S3.3: Top 5 Recommendations',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 2.5,
        'description': 'The five highest-impact actions Goals should take before platform submission.',
    },
    {
        '_temp_id': 'T3_3_1', '_temp_parent_id': 'S3_3',
        'title': 'T3.3.1: Write Top 5 Recommendations',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 2.5,
        'assignees': ['Glen Pryer'],
        'description': (
            'Five specific numbered recommendations. Each must include:\n'
            '- What to change (exact specification)\n'
            '- Why (evidence from analysis)\n'
            '- Revenue impact (conservative-to-optimistic range)\n'
            '- Implementation (which cells, which platform to resubmit)\n'
            '- Risk if skipped\n\n'
            'Expected candidates: (1) pricing position adjustment, (2) regional correction, '
            '(3) discount curve adjustment, (4) first-purchase incentive, (5) launch framing.\n\n'
            'Must pass test: would a studio economy designer respect this and act immediately?\n\n'
            'Done when: 5 recommendations in full format. No vague advice. Every number specific.'
        ),
    },

    # Feature 4: Value-Add (4h, conditional)
    {
        '_temp_id': 'F4', '_temp_parent_id': 'P1',
        'title': 'F4: Value-Add (Conditional - Time Permitting)',
        'item_type': 'feature', 'client_id': CLIENT_ID,
        'status': 'Not started', 'priority': 'Medium', 'hours_estimated': 4,
        'description': (
            'Supplementary tools demonstrating NBI strategic depth and positioning Phase 2.\n'
            'ONLY executed if F1-3 complete within budget. Scope reduced first if any day overruns.\n\n'
            'Budget: 4h (8% of total)'
        ),
    },

    # Story 4.1
    {
        '_temp_id': 'S4_1', '_temp_parent_id': 'F4',
        'title': 'S4.1: Reusable Regional Pricing Methodology',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1.5,
        'description': 'One-page methodology Goals can use for any future SKU without NBI.',
    },
    {
        '_temp_id': 'T4_1_1', '_temp_parent_id': 'S4_1',
        'title': 'T4.1.1: Write How to Price a New SKU Guide',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1.5,
        'assignees': ['Glen Pryer'],
        'description': (
            '6-step methodology:\n'
            '1. Set USD base price (anchor against EA FC equivalent)\n'
            '2. Convert to local currencies using current FX\n'
            '3. Check PPP factor (provide lookup table)\n'
            '4. Compare against EA FC in that market (+/-15% acceptable)\n'
            '5. Round to nearest platform tier\n'
            '6. Verify discount curve is maintained\n\n'
            'Include worked example: pricing a new Celebration at $7.00 USD for Brazil.\n'
            'Include PPP factor table for all launch markets.\n'
            'Position as: "This is the manual method. Phase 2 builds a model that does this automatically."\n\n'
            'Done when: One-page document Julius can follow. Worked example included.'
        ),
    },

    # Story 4.2
    {
        '_temp_id': 'S4_2', '_temp_parent_id': 'F4',
        'title': 'S4.2: World Cup Pricing Opportunity Notes',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1,
        'description': '3-5 tactical pricing observations for the June World Cup window.',
    },
    {
        '_temp_id': 'T4_2_1', '_temp_parent_id': 'S4_2',
        'title': 'T4.2.1: Write World Cup Quick-Hit Observations',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1,
        'assignees': ['Glen Pryer'],
        'description': (
            '3-5 tactical pricing observations for June World Cup:\n\n'
            '- National kit pricing: premium during group stage (emotional spending), discount in knockout (fire sale)\n'
            '- Time-limited "World Cup Coin Pack" at 10% better value than standard - drives urgency\n'
            '- ARPPU peak benchmarks: typical 2-3x normal during major events\n\n'
            'Keep SHORT. Half a page max. Teaser for Phase 2 live service consulting, not a full plan.\n\n'
            'Done when: 3-5 bullet points with specific, actionable World Cup pricing tactics.'
        ),
    },

    # Story 4.3
    {
        '_temp_id': 'S4_3', '_temp_parent_id': 'F4',
        'title': 'S4.3: Phase 2 Positioning',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1.5,
        'description': 'Brief section positioning the larger engagement.',
    },
    {
        '_temp_id': 'T4_3_1', '_temp_parent_id': 'S4_3',
        'title': 'T4.3.1: Write What Is Next Section',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1.5,
        'assignees': ['Tom Rieger'],
        'description': (
            'Position Phase 2 naturally (helpful, not salesy):\n\n'
            '- Post-launch telemetry review (2-3 weeks after 14 May): real data replaces estimates\n'
            '- A/B test design: optimise conversion at each tier using live cohorts\n'
            '- Store optimisation: offer sequencing, time-limited promotion design\n'
            '- World Cup monetisation strategy: full tactical plan for June peak\n'
            '- Ongoing live service consulting: content cadence, engagement frameworks\n\n'
            'Close with: "We recommend a check-in call 2-3 weeks post-launch to review initial '
            'transaction data and scope the next phase."\n'
            'Do NOT include NBI internal pricing for Phase 2.\n\n'
            'Done when: Half-page "What\'s Next" section. Positions naturally.'
        ),
    },

    # Feature 5: Deliverable Assembly (7h)
    {
        '_temp_id': 'F5', '_temp_parent_id': 'P1',
        'title': 'F5: Deliverable Assembly and Client Review',
        'item_type': 'feature', 'client_id': CLIENT_ID,
        'status': 'Not started', 'priority': 'High', 'hours_estimated': 7,
        'description': (
            'Package all analysis into the contracted deliverable: written summary + remote review call.\n\n'
            'Budget: 7h (14% of total)'
        ),
    },

    # Story 5.1
    {
        '_temp_id': 'S5_1', '_temp_parent_id': 'F5',
        'title': 'S5.1: Written Summary Document',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 3,
        'description': 'Create the final client-facing document: 12-18 pages, British English, numbers-backed.',
    },
    {
        '_temp_id': 'T5_1_1', '_temp_parent_id': 'S5_1',
        'title': 'T5.1.1: Assemble the Written Summary',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 3,
        'assignees': ['Glen Pryer'],
        'description': (
            'Final client-facing document structure:\n'
            '1. Executive Summary (1 page) - headline finding, top 5 recs, immediate action\n'
            '2. Your Competitive Position - where Goals sits vs market (F1)\n'
            '3. Regional Pricing Assessment - country risk map + recommendation cards (F2)\n'
            '4. Pricing Scenarios - what-if modelling with revenue impact (S1.2)\n'
            '5. Risk Register - all risks with mitigation (S3.2)\n'
            '6. Recommendations - top 5 specific changes (S3.3)\n'
            '7. Pricing Framework - reusable methodology (F4, if completed)\n'
            '8. World Cup Opportunities - tactical observations (F4, if completed)\n'
            '9. Next Steps - Phase 2 positioning\n'
            '10. Appendix - full comparison tables, country matrix, competitor data\n\n'
            'Style: British English. No em dashes. Direct, specific, numbers-backed. 12-18 pages.\n'
            'Written for Jonas (strategic) and Julius (practitioner) simultaneously.\n\n'
            'Done when: Complete document draft. All sections populated. Internally consistent.'
        ),
    },

    # Story 5.2
    {
        '_temp_id': 'S5_2', '_temp_parent_id': 'F5',
        'title': 'S5.2: Internal Review and Polish',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1.5,
        'description': 'Glen and Tom review before client delivery.',
    },
    {
        '_temp_id': 'T5_2_1', '_temp_parent_id': 'S5_2',
        'title': 'T5.2.1: Quality Gate - Internal Review',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 1.5,
        'assignees': ['Glen Pryer', 'Tom Rieger'],
        'description': (
            'Glen reviews: domain accuracy, tone (expertise without condescension), completeness.\n'
            'Tom reviews: commercial positioning, NBI brand consistency, contractual/legal issues.\n'
            'Address all feedback. Produce final version.\n'
            'Send to Jonas/Julius 24h before review call.\n\n'
            'Done when: Final document approved by Glen and Tom. Sent to client. Call scheduled.'
        ),
    },

    # Story 5.3
    {
        '_temp_id': 'S5_3', '_temp_parent_id': 'F5',
        'title': 'S5.3: Remote Review Session',
        'item_type': 'story', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 2,
        'description': '30-45 minute call walking Jonas/Julius through findings and recommendations.',
    },
    {
        '_temp_id': 'T5_3_1', '_temp_parent_id': 'S5_3',
        'title': 'T5.3.1: Conduct Client Review Call',
        'item_type': 'task', 'client_id': CLIENT_ID,
        'status': 'Not started', 'hours_estimated': 2,
        'assignees': ['Glen Pryer'],
        'description': (
            'Call agenda (30-45 min):\n'
            '- 5 min: Recap scope and methodology\n'
            '- 10 min: Top 5 recommendations (highest impact first)\n'
            '- 10 min: Regional pricing highlights (red countries, what needs to change)\n'
            '- 5 min: Pricing framework overview\n'
            '- 5 min: Next steps / Phase 2\n'
            '- 10 min: Q&A\n\n'
            'Prepared answers:\n'
            '- "Should we delay?" > No, configuration changes not architecture.\n'
            '- "What if platforms reject?" > Built within tier systems. Low risk if compliance verified.\n'
            '- "Can we change later?" > Down only without backlash. Launch high, patch down.\n\n'
            'Follow-up within 24h: summary email, adjusted recs if needed, confirmed next steps.\n\n'
            'Done when: Call completed. Follow-up sent. Phase 2 interest level documented.'
        ),
    },
]

resp = requests.post(f'{BASE}/api/tasks/bulk', headers=HEADERS, json={'tasks': tasks})
print(f'Status: {resp.status_code}')
result = resp.json()
print(f'Result: {json.dumps(result)}')
if resp.status_code == 201:
    print(f'\nSuccessfully imported {result["count"]} items into NBI Hub.')
else:
    print(f'\nERROR: {result}')
