import csv, json, subprocess

TOKEN = json.loads(subprocess.run(['curl', '-s', 'http://localhost:8888/api/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', json.dumps({'username':'glen','password':'nbi2026'})],
    capture_output=True, text=True).stdout)['token']

resp = subprocess.run(['curl', '-s', 'http://localhost:8888/api/expenses',
    '-H', 'Authorization: Bearer ' + TOKEN], capture_output=True, text=True).stdout
expenses = json.loads(resp)
if isinstance(expenses, dict): expenses = expenses.get('expenses', [])

bank = []
for f in [
    r'C:\Users\gpbea\AppData\Local\Temp\Monzo Data Export - CSV (Tuesday, 24 March 2026).csv',
    r'C:\Users\gpbea\AppData\Local\Temp\Monzo Data Export - CSV (Tuesday, 24 March 2026) (1).csv',
    r'C:\Users\gpbea\AppData\Local\Temp\Monzo Data Export - CSV (Tuesday, 24 March 2026) (2).csv',
]:
    with open(f, 'r', encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            bank.append(row)

V2B = {
    'Internet': 'cuckoo', 'Cell Phone': 'o2', 'ChatGPT': 'openai',
    'Claude': 'claude', 'Gamma.App': 'gamma', 'Framer Website': 'framer',
    'Trainline': 'trainline', 'LNER': 'lner', 'First Bus': 'first',
    'Uber': 'uber', 'London Taxi 57859': 'london taxi', 'Taxi': 'taxi',
    'United Airlines': 'united', 'Ibis London Heathrow': 'ibis',
    'Courtesyta Hold': 'courtesyta', 'Korean Bbq House': 'korean bbq',
    'Pret': 'pret', 'Gourmet Coffee Bar': 'gourmet coffee', 'Leon': 'leon',
    'Uber Eats': 'uber eats', 'Blue Bottle Coffee': 'blue bottle',
    'Chipotle': 'chipotle', 'Tastes On The Fly': 'tastes on the fly',
    'Marriott San Fran F&': 'marriott san fran', 'Persona': 'persona',
    'N Beach Mercantil St28': 'n beach', 'Hallmark Connections': 'hallmark',
    'Cole Hardware': 'cole hardware', 'Target': 'target',
    'WHSmith': 'whsmith', 'Curb': 'curb', 'Airalo': 'airalo',
    'Tan Cars': 'tan cars',
}

print('=' * 95)
print('FINAL QA: Dashboard Expenses vs Bank Records')
print('=' * 95)

ok = 0
date_issues = []
amount_issues = []
no_match = []
used_bank = set()

for e in sorted(expenses, key=lambda x: x.get('date', '')):
    desc = (e.get('description') or '').strip()
    amt = round(abs(float(e.get('amount', 0))), 2)
    currency = e.get('currency', 'GBP')
    dash_date = (e.get('date') or '')[:10]

    if dash_date.startswith('2026-04'):
        continue

    bank_kw = V2B.get(desc, desc.lower())

    # Convert dashboard date to DD/MM/YYYY for comparison
    if len(dash_date) == 10:
        dd_parts = dash_date.split('-')
        expected_bank_date = f'{dd_parts[2]}/{dd_parts[1]}/{dd_parts[0]}'
    else:
        expected_bank_date = ''

    found = False
    for i, bt in enumerate(bank):
        if i in used_bank:
            continue
        bt_name = (bt.get('Name') or '').lower()
        bt_date = bt.get('Date', '')
        bt_amt = round(abs(float(bt.get('Amount', 0))), 2)

        if bank_kw[:5] not in bt_name:
            continue
        if abs(bt_amt - amt) > 0.05:
            continue
        # Skip Marriott Marquis hotel room charges
        if 'marriott marquis' in bt_name:
            continue

        used_bank.add(i)

        # Check date
        if bt_date == expected_bank_date:
            ok += 1
            found = True
        else:
            date_issues.append(f'  {desc:<30} Dashboard: {dash_date} | Bank: {bt_date}')
            found = True

        # Check amount
        if abs(bt_amt - amt) > 0.01:
            amount_issues.append(f'  {desc:<30} Dashboard: {currency} {amt} | Bank: GBP {bt_amt}')

        break

    if not found:
        no_match.append(f'  {dash_date} | {desc:<30} | {currency} {amt}')

# Count items still using placeholder date
placeholder_dates = sum(1 for e in expenses if (e.get('date') or '')[:10].endswith('-15') and not (e.get('date') or '').startswith('2026-04'))

print(f'\nTotal dashboard expenses (Jan-Mar): {len([e for e in expenses if not (e.get("date") or "").startswith("2026-04")])}')
print(f'Matched to bank with correct date: {ok}')
print(f'Date mismatches: {len(date_issues)}')
print(f'Amount mismatches: {len(amount_issues)}')
print(f'No bank match: {len(no_match)}')
print(f'Still on placeholder date (15th): {placeholder_dates}')

if date_issues:
    print(f'\n--- DATE MISMATCHES ---')
    for d in date_issues:
        print(d)

if amount_issues:
    print(f'\n--- AMOUNT MISMATCHES ---')
    for a in amount_issues:
        print(a)

if no_match:
    print(f'\n--- NO BANK MATCH ---')
    for n in no_match:
        print(n)

# Currency check
all_gbp = all(e.get('currency') == 'GBP' for e in expenses if not (e.get('date') or '').startswith('2026-04'))
print(f'\nAll expenses now GBP: {all_gbp}')

# Final total
total = sum(abs(float(e.get('amount', 0))) for e in expenses if not (e.get('date') or '').startswith('2026-04'))
print(f'Total expense amount: GBP {total:.2f}')

pct = ok / max(len([e for e in expenses if not (e.get("date") or "").startswith("2026-04")]), 1) * 100
print(f'\nAccuracy: {pct:.0f}%')
