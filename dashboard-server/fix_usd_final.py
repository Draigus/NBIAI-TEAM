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
    'United Airlines': 'united', 'Uber Eats': 'uber eats',
    'Blue Bottle Coffee': 'blue bottle', 'Chipotle': 'chipotle',
    'Tastes On The Fly': 'tastes on the fly',
    'Marriott San Fran F&': 'marriott san fran', 'Persona': 'persona',
    'N Beach Mercantil St28': 'n beach', 'Cole Hardware': 'cole hardware',
    'Target': 'target', 'Curb': 'curb', 'Airalo': 'airalo',
    'WHSmith': 'wh smith',
}

used_bank = set()
fixes = 0
still_missing = 0

# The key insight: Excel amounts for "USD" items are actually the GBP bank amounts.
# Fix: change currency from USD to GBP, and match by GBP amount in bank.
for e in expenses:
    desc = (e.get('description') or '').strip()
    eid = e['id']
    amt = round(abs(float(e.get('amount', 0))), 2)
    currency = e.get('currency', 'GBP')
    dash_date = (e.get('date') or '')[:10]
    dash_month = dash_date[5:7]

    if dash_date.startswith('2026-04'):
        continue

    # Only process items still needing fixes (USD items or WHSmith)
    if desc not in V2B:
        continue
    # Skip if already fixed (not on 15th)
    if currency == 'GBP' and not dash_date.endswith('-15'):
        continue

    bank_kw = V2B[desc]
    month_str = {'01': '/01/2026', '02': '/02/2026', '03': '/03/2026'}.get(dash_month, '')

    for i, bt in enumerate(bank):
        if i in used_bank:
            continue
        bt_name = (bt.get('Name') or '').lower()
        bt_date = bt.get('Date', '')
        bt_amt = round(abs(float(bt.get('Amount', 0))), 2)

        if month_str not in bt_date:
            continue
        if bank_kw not in bt_name:
            continue
        # Match by GBP amount (the bank Amount column is always GBP)
        if abs(bt_amt - amt) > 0.05:
            continue
        # Skip hotel room charges and refunds (large Marriott amounts)
        if 'marriott marquis' in bt_name.lower() or 'san francisco marriott marquis' in bt_name.lower():
            continue

        used_bank.add(i)
        parts = bt_date.split('/')
        iso_date = f'{parts[2]}-{parts[1]}-{parts[0]}'

        patch = {'date': iso_date}
        if currency == 'USD':
            patch['currency'] = 'GBP'  # Fix: these are GBP amounts, not USD

        desc_short = desc[:30]
        old_cur = currency
        new_cur = patch.get('currency', old_cur)
        print(f'FIX: {desc_short:<30} {old_cur} {amt} -> {new_cur} {amt} | {dash_date} -> {iso_date}')
        api('PATCH', '/api/expenses/' + eid, patch)
        fixes += 1
        break
    else:
        still_missing += 1
        print(f'MISS: {desc:<30} {currency} {amt} (no bank match)')

print(f'\n===== SUMMARY =====')
print(f'Fixes applied: {fixes}')
print(f'Still missing: {still_missing}')
