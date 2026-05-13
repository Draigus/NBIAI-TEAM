"""Fix Goals WorkSage items: dates to 27 Apr, clear assignees, correct hours, clean descriptions."""
import requests, json

BASE = 'http://localhost:8888'
resp = requests.post(f'{BASE}/api/auth/login', json={'username': 'glen', 'password': 'nbi2026'})
TOKEN = resp.json()['token']
HEADERS = {'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'}

resp = requests.get(f'{BASE}/api/tasks?limit=100', headers=HEADERS)
data = resp.json()
rows = data['rows'] if isinstance(data, dict) else data

by_prefix = {}
project_item = None
for r in rows:
    title = r.get('title', '')
    if title == 'Goals Studio Pricing Engagement':
        project_item = r
    if ':' in title:
        prefix = title.split(':')[0].strip()
        by_prefix[prefix] = r

# Corrected hours (matching plan v2)
plan_hours = {
    'F1': 38, 'F2': 34, 'F3': 16, 'F4': 8, 'F5': 18,
    'S1.0': 8, 'S1.1': 19, 'S1.2': 8, 'S1.3': 5,
    'S2.1': 23, 'S2.2': 3, 'S2.3': 8,
    'S3.1': 4, 'S3.2': 5, 'S3.3': 7,
    'S4.1': 3, 'S4.2': 2, 'S4.3': 3,
    'S5.1': 10, 'S5.2': 4, 'S5.3': 4,
    'T1.0.1': 3, 'T1.0.2': 5,
    'T1.1.1': 8, 'T1.1.2': 4, 'T1.1.3': 5, 'T1.1.4': 2,
    'T1.2.1': 8, 'T1.3.1': 5,
    'T2.1.1': 8, 'T2.1.2': 15, 'T2.2.1': 3, 'T2.3.1': 8,
    'T3.1.1': 4, 'T3.2.1': 5, 'T3.3.1': 7,
    'T4.1.1': 3, 'T4.2.1': 2, 'T4.3.1': 3,
    'T5.1.1': 10, 'T5.2.1': 4, 'T5.3.1': 4,
}

# Corrected dates (everything within 27 April)
plan_dates = {
    'F1': ('2026-04-22', '2026-04-23'),
    'F2': ('2026-04-23', '2026-04-25'),
    'F3': ('2026-04-25', '2026-04-25'),
    'F4': ('2026-04-25', '2026-04-25'),
    'F5': ('2026-04-26', '2026-04-27'),
    'S1.0': ('2026-04-22', '2026-04-22'),
    'S1.1': ('2026-04-22', '2026-04-23'),
    'S1.2': ('2026-04-23', '2026-04-23'),
    'S1.3': ('2026-04-23', '2026-04-23'),
    'S2.1': ('2026-04-23', '2026-04-24'),
    'S2.2': ('2026-04-24', '2026-04-24'),
    'S2.3': ('2026-04-24', '2026-04-25'),
    'S3.1': ('2026-04-25', '2026-04-25'),
    'S3.2': ('2026-04-25', '2026-04-25'),
    'S3.3': ('2026-04-25', '2026-04-25'),
    'S4.1': ('2026-04-25', '2026-04-25'),
    'S4.2': ('2026-04-25', '2026-04-25'),
    'S4.3': ('2026-04-25', '2026-04-25'),
    'S5.1': ('2026-04-26', '2026-04-26'),
    'S5.2': ('2026-04-26', '2026-04-26'),
    'S5.3': ('2026-04-27', '2026-04-27'),
    'T1.0.1': ('2026-04-22', '2026-04-22'),
    'T1.0.2': ('2026-04-22', '2026-04-22'),
    'T1.1.1': ('2026-04-22', '2026-04-22'),
    'T1.1.2': ('2026-04-22', '2026-04-22'),
    'T1.1.3': ('2026-04-23', '2026-04-23'),
    'T1.1.4': ('2026-04-23', '2026-04-23'),
    'T1.2.1': ('2026-04-23', '2026-04-23'),
    'T1.3.1': ('2026-04-23', '2026-04-23'),
    'T2.1.1': ('2026-04-23', '2026-04-24'),
    'T2.1.2': ('2026-04-24', '2026-04-24'),
    'T2.2.1': ('2026-04-24', '2026-04-24'),
    'T2.3.1': ('2026-04-24', '2026-04-25'),
    'T3.1.1': ('2026-04-25', '2026-04-25'),
    'T3.2.1': ('2026-04-25', '2026-04-25'),
    'T3.3.1': ('2026-04-25', '2026-04-25'),
    'T4.1.1': ('2026-04-25', '2026-04-25'),
    'T4.2.1': ('2026-04-25', '2026-04-25'),
    'T4.3.1': ('2026-04-25', '2026-04-25'),
    'T5.1.1': ('2026-04-26', '2026-04-26'),
    'T5.2.1': ('2026-04-26', '2026-04-26'),
    'T5.3.1': ('2026-04-27', '2026-04-27'),
}

# Corrected success factors (clean language, no jargon, no person names)
plan_sf = {
    'T1.0.1': 'One-page document showing all 6 HC tiers and what each buys. Any unconfirmed prices flagged. The value chain can be explained to the client in plain English.',
    'T1.0.2': 'Written assessment with at least 2 cited sources comparing Goals assumptions to real-world data. Clear verdict: realistic, aggressive, or unrealistic. If aggressive, the implication for pricing strategy is stated.',
    'T1.1.1': 'Position map for all 6 tiers. Each shows: Goals price, market range (min/median/max), Goals percentile. One clear sentence summarising overall position.',
    'T1.1.2': 'Comparison table showing discount curves for Goals plus 4 competitors. Written recommendation: keep, steepen, or flatten the curve. With reasoning.',
    'T1.1.3': 'Written audit covering: entry point assessment, tier gap analysis, whale ceiling analysis. Clear recommendation for each. Supported by competitor comparison.',
    'T1.1.4': 'Complete net revenue table (6 tiers x 4 platforms = 24 cells). Any margin concerns flagged. Epic revenue advantage quantified as a percentage.',
    'T1.2.1': '4 scenarios modelled with revenue ranges. Each shows: price change, assumed conversion impact, net revenue change. Clear recommendation on which scenario is best for launch.',
    'T1.3.1': '2-3 specific first-purchase recommendations. Each includes: what it is, what it costs, expected benefit. Clearly framed as additional to core pricing.',
    'T2.1.1': 'Every country has a colour rating. Red countries have a one-sentence explanation of the problem. Output is a ranked list with highest-risk markets at the top.',
    'T2.1.2': 'Comparison table for all red/amber countries. Each row: country, Goals price, EA FC price, Fortnite price, percentage difference. Sources cited for every price.',
    'T2.2.1': 'Written confirmation: all prices are valid platform tiers, OR a list of specific prices needing adjustment with the nearest valid tier for each.',
    'T2.3.1': '8-12 country cards completed. Each is self-contained. Julius can read one card and know exactly what to change in the pricing spreadsheet for that country.',
    'T3.1.1': 'One paragraph that Jonas can read and immediately know whether to raise prices or not. Contains a specific recommendation with a number.',
    'T3.2.1': 'Minimum 10 risks documented. Each has severity, likelihood, affected markets, and a mitigation action. Top 3 have specific, implementable steps.',
    'T3.3.1': '5 recommendations written. Each has: exact change, evidence, expected revenue impact (range), and what happens if skipped. A studio economy designer would act on these immediately.',
    'T4.1.1': 'One-page guide that Julius can follow to price any new SKU without external help. Worked example included. PPP lookup table for all launch markets included.',
    'T4.2.1': '3-5 bullet points. Each is a specific, actionable pricing tactic for the World Cup window. Clearly positioned as a preview of what a deeper engagement would cover.',
    'T4.3.1': 'Half-page section. Reads as genuine advice, not upselling. Recommends a check-in call 2-3 weeks post-launch. Does NOT include NBI pricing.',
    'T5.1.1': 'Complete document draft ready for internal review. All sections filled with real findings (no placeholders). Internally consistent. Written in British English.',
    'T5.2.1': 'Final document approved internally. Sent to client 24 hours before review call. Call scheduled and confirmed.',
    'T5.3.1': 'Call completed. Follow-up email sent within 24 hours. Phase 2 interest level documented. Any adjusted recommendations captured.',
}

# Corrected descriptions for items with known issues
desc_fixes = {
    'T1.0.1': "Document the complete path from real money to in-game value in Goals.\n\nKey mapping: 1 HC coin = 50 points = $0.012 USD at base rate (25,000 points = 500 coins = $6.00 USD from Pricing Model Conversion rates sheet).\n\nMap what each HC tier ACTUALLY buys:\n- 380 HC ($5.99): 1 Internal Kit (333 coins) with 47 coins leftover\n- 650 HC ($9.99): 1 Internal Kit + 317 leftover (not enough for second kit)\n- Map all item categories with HC costs\n\nGAP: Mech and Pulse kit HC pricing not documented in client materials. Confirm with Julius.\n\nIdentify minimum meaningful purchase - cheapest satisfying thing a new player can buy.\n\nSources: Goals Studio Monetisation Design Doc, Pricing Model, player_pricing.md",
}

updated = 0
errors = 0

# Fix project item
if project_item:
    old_desc = project_item.get('description', '')
    new_desc = old_desc.replace('Glen Pryer (relationship + domain), Tom Rieger (contract/President), Devin Rieger (research)', 'To be assigned by team lead')
    new_desc = new_desc.replace('GG-Monetization', 'Goals Studio Monetisation Design Doc')
    patch = {
        'hours_estimated': 116,
        'start_date': '2026-04-22',
        'end_date': '2026-04-27',
        'due_date': '2026-04-27',
        'description': new_desc,
        'assignees': [],
    }
    resp = requests.patch(f'{BASE}/api/tasks/{project_item["id"]}', headers=HEADERS, json=patch)
    if resp.status_code == 200:
        updated += 1
        print(f'  OK: Project - hours 116h, due 2026-04-27, assignees cleared, names removed')
    else:
        errors += 1
        print(f'  FAIL: Project - {resp.status_code} {resp.text[:100]}')

# Fix all prefixed items
for prefix, item in by_prefix.items():
    patch = {'assignees': []}

    if prefix in plan_hours:
        patch['hours_estimated'] = plan_hours[prefix]

    if prefix in plan_dates:
        patch['start_date'] = plan_dates[prefix][0]
        patch['end_date'] = plan_dates[prefix][1]
        patch['due_date'] = plan_dates[prefix][1]

    if prefix in plan_sf:
        patch['success_factor'] = plan_sf[prefix]

    if prefix in desc_fixes:
        patch['description'] = desc_fixes[prefix]
    else:
        old_desc = item.get('description', '') or ''
        if 'GG-Monetization' in old_desc or 'GG-' in old_desc:
            patch['description'] = old_desc.replace('GG-Monetization', 'Goals Studio Monetisation Design Doc').replace('GG-', 'Goals Studio ')

    resp = requests.patch(f'{BASE}/api/tasks/{item["id"]}', headers=HEADERS, json=patch)
    if resp.status_code == 200:
        updated += 1
    else:
        errors += 1
        print(f'  FAIL: {prefix} - {resp.status_code} {resp.text[:100]}')

print(f'\nUpdated {updated} items, {errors} errors')
