import csv, json, subprocess

TOKEN = json.loads(subprocess.run(['curl', '-s', 'http://localhost:8888/api/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', json.dumps({'username':'glen','password':'nbi2026'})],
    capture_output=True, text=True).stdout)['token']

def api(method, path, body=None):
    cmd = ['curl', '-s', '-X', method, 'http://localhost:8888' + path,
           '-H', 'Authorization: Bearer ' + TOKEN, '-H', 'Content-Type: application/json']
    if body: cmd.extend(['-d', json.dumps(body)])
    r = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(r.stdout) if r.stdout.strip() else {}

resp = api('GET', '/api/expenses')
expenses = resp if isinstance(resp, list) else resp.get('expenses', [])

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
    'WHSmith': 'wh smith', 'Curb': 'curb', 'Airalo': 'airalo',
    'Tan Cars': 'tan cars',
}

MONTH_FILTER = {'01': '/01/2026', '02': '/02/2026', '03': '/03/2026'}

fixes = 0
errors = 0
used_bank = set()

for e in expenses:
    desc = (e.get('description') or '').strip()
    eid = e['id']
    amt = round(abs(float(e.get('amount', 0))), 2)
    currency = e.get('currency', 'GBP')
    dash_date = (e.get('date') or '')[:10]
    dash_month = dash_date[5:7]

    if dash_date.startswith('2026-04'):
        continue

    bank_kw = V2B.get(desc, desc.lower())
    month_str = MONTH_FILTER.get(dash_month, '')

    # FIX 1: Claude Feb
    if desc == 'Claude' and dash_month == '02':
        print(f'FIX: Claude Feb {amt} -> 165.19, date -> 2026-02-03')
        api('PATCH', '/api/expenses/' + eid, {'amount': 165.19, 'date': '2026-02-03'})
        fixes += 1
        continue

    # FIX 2: Claude Mar
    if desc == 'Claude' and dash_month == '03':
        print(f'FIX: Claude Mar {amt} -> 180.00, date -> 2026-03-03')
        api('PATCH', '/api/expenses/' + eid, {'amount': 180.00, 'date': '2026-03-03'})
        fixes += 1
        continue

    # FIX 3: Framer Jan split
    if desc == 'Framer Website' and dash_month == '01' and amt == 379.20:
        print(f'FIX: Framer Jan {amt} -> 48.00, date -> 2026-01-07')
        api('PATCH', '/api/expenses/' + eid, {'amount': 48.00, 'date': '2026-01-07'})
        fixes += 1
        continue

    # FIX 4: All dates from 15th to actual bank date
    if not dash_date.endswith('-15'):
        continue

    best_match = None
    for i, bt in enumerate(bank):
        if i in used_bank:
            continue
        bt_name = (bt.get('Name') or '').lower()
        bt_date = bt.get('Date', '')
        bt_amt = round(abs(float(bt.get('Amount', 0))), 2)
        bt_local_amt = round(abs(float(bt.get('Local amount', 0))), 2)
        bt_local_cur = bt.get('Local currency', 'GBP')

        if month_str not in bt_date:
            continue
        if bank_kw[:5] not in bt_name:
            continue

        if currency == 'USD' and bt_local_cur == 'USD':
            if abs(bt_local_amt - amt) > 0.5:
                continue
        elif currency == 'GBP':
            if abs(bt_amt - amt) > 0.5:
                continue
        else:
            if abs(bt_amt - amt) > 0.5 and abs(bt_local_amt - amt) > 0.5:
                continue

        best_match = (i, bt)
        break

    if best_match:
        idx, bt = best_match
        used_bank.add(idx)
        parts = bt['Date'].split('/')
        iso_date = f'{parts[2]}-{parts[1]}-{parts[0]}'
        print(f'DATE: {desc:<30} {dash_date} -> {iso_date}')
        api('PATCH', '/api/expenses/' + eid, {'date': iso_date})
        fixes += 1
    else:
        errors += 1
        print(f'SKIP: {desc:<30} {currency} {amt} -- no bank match')

# FIX 3b: Create second Framer Jan charge
print(f'\nCREATE: Framer Website 2nd Jan charge -> 331.20, date 2026-01-30')
framer_cat = None
for e in expenses:
    if (e.get('description') or '').strip() == 'Framer Website':
        framer_cat = e.get('category_id')
        break
result = api('POST', '/api/expenses', {
    'description': 'Framer Website',
    'amount': 331.20,
    'currency': 'GBP',
    'category_id': framer_cat,
    'date': '2026-01-30',
})
if result.get('id'):
    print(f'  Created: {result["id"]}')
    fixes += 1
else:
    print(f'  FAILED: {result}')
    errors += 1

print(f'\n===== SUMMARY =====')
print(f'Fixes applied: {fixes}')
print(f'Could not match: {errors}')
