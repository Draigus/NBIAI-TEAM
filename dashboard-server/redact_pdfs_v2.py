import pymupdf
import csv, json, subprocess, re, os

# ===== 1. BUILD PRECISE MATCH SET =====
TOKEN = json.loads(subprocess.run(['curl', '-s', 'http://localhost:8888/api/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', json.dumps({'username':'glen','password':'nbi2026'})],
    capture_output=True, text=True).stdout)['token']

resp = subprocess.run(['curl', '-s', 'http://localhost:8888/api/expenses',
    '-H', 'Authorization: Bearer ' + TOKEN], capture_output=True, text=True).stdout
expenses = json.loads(resp)
if isinstance(expenses, dict): expenses = expenses.get('expenses', [])

# Build bank CSV -> dashboard mapping using actual matched pairs
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

# Build set of (bank_date_DD/MM/YYYY, gbp_amount) pairs that should be visible
# This is the PRECISE match: date + amount must both match
visible_txns = set()
used_bank = set()

for e in expenses:
    desc = (e.get('description') or '').strip()
    amt = round(abs(float(e.get('amount', 0))), 2)
    dash_date = (e.get('date') or '')[:10]
    if dash_date.startswith('2026-04'):
        continue

    bank_kw = V2B.get(desc, desc.lower())

    # Convert YYYY-MM-DD to DD/MM/YYYY
    parts = dash_date.split('-')
    expected_date = f'{parts[2]}/{parts[1]}/{parts[0]}'

    for i, bt in enumerate(bank):
        if i in used_bank:
            continue
        bt_name = (bt.get('Name') or '').lower()
        bt_date = bt.get('Date', '')
        bt_amt = round(abs(float(bt.get('Amount', 0))), 2)

        if bt_date != expected_date:
            continue
        if bank_kw[:5] not in bt_name:
            continue
        if abs(bt_amt - amt) > 0.05:
            continue
        if 'marriott marquis' in bt_name:
            continue

        used_bank.add(i)
        visible_txns.add((bt_date, bt_amt))
        break

print(f"Expense-matched bank transactions to keep visible: {len(visible_txns)}")

# Also map to PDF text: build (date, amount_str) pairs for PDF matching
# The PDF shows amounts like "-18.11" or "48.00"
visible_date_amounts = set()
for (dt, amt) in visible_txns:
    visible_date_amounts.add((dt, f"{amt:.2f}"))
    visible_date_amounts.add((dt, f"-{amt:.2f}"))

SENSITIVE_HEADER = [
    "sort code", "account number", "bic:", "iban:",
    "balance", "outgoing", "deposit",
    "excluding all pots", "regular pots",
    "external providers",
]

date_pattern = re.compile(r'^\d{2}/\d{2}/\d{4}$')
BALANCE_COL_X0 = 450

# ===== 2. PROCESS EACH PDF =====
pdf_files = [
    r"C:\Users\gpbea\AppData\Local\Temp\Monzo_bank_statement_2026-01-01-2026-03-24_1481.pdf",
    r"C:\Users\gpbea\AppData\Local\Temp\Monzo_bank_statement_2026-01-01-2026-03-24_155.pdf",
    r"C:\Users\gpbea\AppData\Local\Temp\Monzo_flex_statement_2026_01_01-2026_03_25_6725.pdf",
]

output_dir = r"D:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server\uploads"

for pdf_path in pdf_files:
    if not os.path.exists(pdf_path):
        continue

    basename = os.path.basename(pdf_path).replace('.pdf', '_REDACTED.pdf')
    output_path = os.path.join(output_dir, basename)

    doc = pymupdf.open(pdf_path)
    print(f"\n=== {os.path.basename(pdf_path)} ({len(doc)} pages) ===")

    kept = 0
    redacted = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        text_dict = page.get_text("dict")

        all_spans = []
        for block in text_dict["blocks"]:
            if "lines" not in block:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    t = span["text"].strip()
                    if t:
                        all_spans.append({
                            "text": t,
                            "bbox": span["bbox"],
                            "x0": span["bbox"][0],
                            "y": span["bbox"][1],
                        })

        # 1. REDACT SENSITIVE HEADER INFO
        for sp in all_spans:
            t_lower = sp["text"].lower()
            if any(pat in t_lower for pat in SENSITIVE_HEADER):
                rect = pymupdf.Rect(sp["bbox"][0] - 2, sp["bbox"][1] - 2,
                                     sp["bbox"][2] + 2, sp["bbox"][3] + 2)
                page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))

            if sp["y"] < 400:
                cleaned = sp["text"].replace(',', '').replace('+', '').replace('-', '').strip()
                if re.match(r'^\d+\.\d{2}$', cleaned):
                    rect = pymupdf.Rect(sp["bbox"][0] - 2, sp["bbox"][1] - 2,
                                         sp["bbox"][2] + 2, sp["bbox"][3] + 2)
                    page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))
                if re.match(r'^[\u00a3\$]\d', sp["text"]):
                    rect = pymupdf.Rect(sp["bbox"][0] - 2, sp["bbox"][1] - 2,
                                         sp["bbox"][2] + 2, sp["bbox"][3] + 2)
                    page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))

        # 2. ALWAYS REDACT BALANCE COLUMN
        for sp in all_spans:
            if sp["x0"] >= BALANCE_COL_X0 and sp["y"] > 430:
                rect = pymupdf.Rect(sp["bbox"][0] - 2, sp["bbox"][1] - 2,
                                     sp["bbox"][2] + 2, sp["bbox"][3] + 2)
                page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))
        for sp in all_spans:
            if "balance" in sp["text"].lower() and sp["x0"] > 400:
                rect = pymupdf.Rect(sp["bbox"][0] - 2, sp["bbox"][1] - 2,
                                     sp["bbox"][2] + 2, sp["bbox"][3] + 2)
                page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))

        # 3. IDENTIFY TRANSACTIONS — match by date + amount
        date_spans = [sp for sp in all_spans if date_pattern.match(sp["text"]) and sp["x0"] < 130]
        date_spans.sort(key=lambda x: x["y"])

        for di, ds in enumerate(date_spans):
            y_start = ds["y"]
            if di + 1 < len(date_spans):
                y_end = date_spans[di + 1]["y"] - 5
            else:
                y_end = y_start + 80

            txn_date = ds["text"]

            # Find the amount in this transaction (in the amount column, x0 ~373-440)
            txn_amounts = []
            for sp in all_spans:
                if (y_start - 10 <= sp["y"] <= y_end
                    and sp["x0"] >= 370 and sp["x0"] < BALANCE_COL_X0):
                    cleaned = sp["text"].replace(',', '').strip()
                    if re.match(r'^-?\d+\.\d{2}$', cleaned):
                        txn_amounts.append(cleaned)

            # Check if this (date, amount) pair matches an expense
            is_expense = False
            for amt_str in txn_amounts:
                clean_amt = f"{abs(float(amt_str)):.2f}"
                neg_amt = f"-{clean_amt}"
                if (txn_date, clean_amt) in visible_date_amounts or (txn_date, neg_amt) in visible_date_amounts:
                    is_expense = True
                    break

            if is_expense:
                kept += 1
            else:
                redacted += 1
                # Redact description and amount (keep date visible)
                for sp in all_spans:
                    if y_start - 10 <= sp["y"] <= y_end and sp["x0"] >= 140 and sp["x0"] < BALANCE_COL_X0:
                        rect = pymupdf.Rect(sp["bbox"][0] - 1, sp["bbox"][1] - 1,
                                             sp["bbox"][2] + 1, sp["bbox"][3] + 1)
                        page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))

    doc.save(output_path)
    doc.close()

    size_kb = os.path.getsize(output_path) / 1024
    print(f"  Visible: {kept} expense transactions")
    print(f"  Redacted: {redacted} non-expense transactions")
    print(f"  Saved: {basename} ({size_kb:.1f}KB)")

print("\nDone. PDFs in:", output_dir)
