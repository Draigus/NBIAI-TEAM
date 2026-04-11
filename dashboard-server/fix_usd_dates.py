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

# Wider keyword map for USD items
V2B_USD = {
    'United Airlines': 'united',
    'Uber Eats': 'uber eats',
    'Blue Bottle Coffee': 'blue bottle',
    'Chipotle': 'chipotle',
    'Tastes On The Fly': 'tastes on the fly',
    'Marriott San Fran F&': 'marriott san fran',
    'Persona': 'persona',
    'N Beach Mercantil St28': 'n beach',
    'Cole Hardware': 'cole hardware',
    'Target': 'target',
    'Curb': 'curb',
    'Airalo': 'airalo',
    'WHSmith': 'wh smith',
}

# Also handle GBP items that failed: Caffe Nero, WHSmith
GBP_FIXES = {
    'WHSmith': 'wh smith',
}

used_bank = set()
fixes = 0
still_missing = 0

for e in expenses:
    desc = (e.get('description') or '').strip()
    eid = e['id']
    amt = round(abs(float(e.get('amount', 0))), 2)
    currency = e.get('currency', 'GBP')
    dash_date = (e.get('date') or '')[:10]

    # Only fix items still on the 15th (unfixed)
    if not dash_date.endswith('-15'):
        continue
    if dash_date.startswith('2026-04'):
        continue

    dash_month = dash_date[5:7]
    month_str = {'01': '/01/2026', '02': '/02/2026', '03': '/03/2026'}.get(dash_month, '')

    # Try USD matching: match by local_amount (USD) in bank
    if currency == 'USD' and desc in V2B_USD:
        bank_kw = V2B_USD[desc]
        for i, bt in enumerate(bank):
            if i in used_bank:
                continue
            bt_name = (bt.get('Name') or '').lower()
            bt_date = bt.get('Date', '')
            bt_local_amt = round(abs(float(bt.get('Local amount', 0))), 2)
            bt_local_cur = bt.get('Local currency', 'GBP')

            if month_str not in bt_date:
                continue
            if bank_kw not in bt_name:
                continue
            if bt_local_cur != 'USD':
                continue
            if abs(bt_local_amt - amt) > 0.5:
                continue

            used_bank.add(i)
            parts = bt_date.split('/')
            iso_date = f'{parts[2]}-{parts[1]}-{parts[0]}'
            print(f'USD FIX: {desc:<30} {dash_date} -> {iso_date} (USD {amt} matched bank local {bt_local_amt})')
            api('PATCH', '/api/expenses/' + eid, {'date': iso_date})
            fixes += 1
            break
        else:
            still_missing += 1
            print(f'STILL MISSING: {desc:<30} USD {amt}')
        continue

    # Try GBP items that failed on first pass
    if currency == 'GBP' and desc in GBP_FIXES:
        bank_kw = GBP_FIXES[desc]
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
            if abs(bt_amt - amt) > 0.5:
                continue

            used_bank.add(i)
            parts = bt_date.split('/')
            iso_date = f'{parts[2]}-{parts[1]}-{parts[0]}'
            print(f'GBP FIX: {desc:<30} {dash_date} -> {iso_date}')
            api('PATCH', '/api/expenses/' + eid, {'date': iso_date})
            fixes += 1
            break
        else:
            still_missing += 1
            print(f'STILL MISSING: {desc:<30} GBP {amt}')
        continue

    # Caffe Nero special case
    if 'nero' in desc.lower() or 'caff' in desc.lower():
        for i, bt in enumerate(bank):
            if i in used_bank:
                continue
            bt_name = (bt.get('Name') or '').lower()
            bt_date = bt.get('Date', '')
            bt_amt = round(abs(float(bt.get('Amount', 0))), 2)
            if month_str not in bt_date:
                continue
            if 'nero' not in bt_name and 'caff' not in bt_name:
                continue
            if abs(bt_amt - amt) > 0.5:
                continue
            used_bank.add(i)
            parts = bt_date.split('/')
            iso_date = f'{parts[2]}-{parts[1]}-{parts[0]}'
            print(f'GBP FIX: {desc:<30} {dash_date} -> {iso_date}')
            api('PATCH', '/api/expenses/' + eid, {'date': iso_date})
            fixes += 1
            break
        else:
            still_missing += 1
            print(f'STILL MISSING: {desc:<30} GBP {amt}')
        continue

print(f'\n===== SUMMARY =====')
print(f'Fixes applied: {fixes}')
print(f'Still missing: {still_missing}')
