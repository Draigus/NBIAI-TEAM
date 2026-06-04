import pymupdf
import csv, json, subprocess, re, os

# ===== 1. BUILD MATCH SET FROM CURRENT DASHBOARD EXPENSES =====
TOKEN = json.loads(subprocess.run(['curl', '-s', 'http://localhost:8888/api/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', json.dumps({'username':'glen','password':'nbi2026'})],
    capture_output=True, text=True).stdout)['token']

resp = subprocess.run(['curl', '-s', 'http://localhost:8888/api/expenses',
    '-H', 'Authorization: Bearer ' + TOKEN], capture_output=True, text=True).stdout
expenses = json.loads(resp)
if isinstance(expenses, dict): expenses = expenses.get('expenses', [])

# Build a set of (amount_gbp) values that should be visible
# The bank PDF always shows GBP amounts
expense_amounts = set()
for e in expenses:
    amt = round(abs(float(e.get('amount', 0))), 2)
    date = (e.get('date') or '')[:10]
    if date.startswith('2026-04'):
        continue
    expense_amounts.add(amt)

print(f"Dashboard expenses (Jan-Mar): {len([e for e in expenses if not (e.get('date') or '').startswith('2026-04')])}")
print(f"Unique expense amounts: {len(expense_amounts)}")

# Keywords that identify expense vendors in the PDF text
PDF_EXPENSE_KEYWORDS = [
    "openai", "chatgpt",
    "anthropic", "claude",
    "gamma.app", "gamma app",
    "framer",
    "cuckoo fibre", "cuckoo",
    "o2payg", "o2 payg",
    "trainline",
    "lner",
    "first eastern",
    "uber", "ubr*",
    "london taxi",
    "taxi", "tan cars",
    "united houston", "united airlines", "united ",
    "ibis london",
    "courtesyta",
    "korean bbq",
    "pret a manger",
    "gourmet coffee",
    "leon ",
    "blue bottle",
    "chipotle",
    "tastes on the fly",
    "marriott san fran",
    "persona ",
    "n beach mercantil",
    "hallmark connection",
    "cole hardware",
    "target ",
    "wh smith", "whsmith",
    "curb mobility",
    "airalo",
    "nero",
]

# Sensitive header patterns to always redact
SENSITIVE_HEADER = [
    "sort code", "account number", "bic:", "iban:",
    "balance", "outgoing", "deposit",
    "excluding all pots", "regular pots",
    "external providers",
]

def matches_expense(text):
    """Check if text contains an expense vendor keyword"""
    t = text.lower()
    for kw in PDF_EXPENSE_KEYWORDS:
        if kw in t:
            return True
    return False

# Column boundaries (from PDF analysis)
BALANCE_COL_X0 = 450
date_pattern = re.compile(r'^\d{2}/\d{2}/\d{4}$')

# ===== 2. PROCESS EACH PDF =====
pdf_files = [
    r"C:\Users\gpbea\AppData\Local\Temp\Monzo_bank_statement_2026-01-01-2026-03-24_1481.pdf",
    r"C:\Users\gpbea\AppData\Local\Temp\Monzo_bank_statement_2026-01-01-2026-03-24_155.pdf",
    r"C:\Users\gpbea\AppData\Local\Temp\Monzo_flex_statement_2026_01_01-2026_03_25_6725.pdf",
]

output_dir = r"D:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server\uploads"
os.makedirs(output_dir, exist_ok=True)

for pdf_path in pdf_files:
    if not os.path.exists(pdf_path):
        print(f"SKIP: {pdf_path} not found")
        continue

    basename = os.path.basename(pdf_path).replace('.pdf', '_REDACTED.pdf')
    output_path = os.path.join(output_dir, basename)

    doc = pymupdf.open(pdf_path)
    print(f"\n=== {os.path.basename(pdf_path)} ({len(doc)} pages) ===")

    kept = 0
    redacted_txns = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        text_dict = page.get_text("dict")

        # Collect all spans
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

            # Redact monetary values in header area (before transaction table)
            if sp["y"] < 400:
                cleaned = sp["text"].replace(',', '').replace('+', '').replace('-', '').strip()
                if re.match(r'^\d+\.\d{2}$', cleaned):
                    rect = pymupdf.Rect(sp["bbox"][0] - 2, sp["bbox"][1] - 2,
                                         sp["bbox"][2] + 2, sp["bbox"][3] + 2)
                    page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))
                # Also redact pound signs with numbers
                if re.match(r'^[\u00a3\$]\d', sp["text"]):
                    rect = pymupdf.Rect(sp["bbox"][0] - 2, sp["bbox"][1] - 2,
                                         sp["bbox"][2] + 2, sp["bbox"][3] + 2)
                    page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))

        # 2. ALWAYS REDACT BALANCE COLUMN (running balance on every transaction)
        for sp in all_spans:
            if sp["x0"] >= BALANCE_COL_X0 and sp["y"] > 430:
                rect = pymupdf.Rect(sp["bbox"][0] - 2, sp["bbox"][1] - 2,
                                     sp["bbox"][2] + 2, sp["bbox"][3] + 2)
                page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))

        # Also redact "Balance" column header
        for sp in all_spans:
            if "balance" in sp["text"].lower() and sp["x0"] > 400:
                rect = pymupdf.Rect(sp["bbox"][0] - 2, sp["bbox"][1] - 2,
                                     sp["bbox"][2] + 2, sp["bbox"][3] + 2)
                page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))

        # 3. IDENTIFY TRANSACTIONS AND REDACT NON-EXPENSE ONES
        date_spans = [sp for sp in all_spans if date_pattern.match(sp["text"]) and sp["x0"] < 130]
        date_spans.sort(key=lambda x: x["y"])

        for di, ds in enumerate(date_spans):
            y_start = ds["y"]
            if di + 1 < len(date_spans):
                y_end = date_spans[di + 1]["y"] - 5
            else:
                y_end = y_start + 80

            # Collect description text for this transaction
            desc_text = " ".join(
                sp["text"] for sp in all_spans
                if sp["x0"] >= 140 and sp["x0"] < 400
                and y_start - 10 <= sp["y"] <= y_end
            )

            if matches_expense(desc_text):
                kept += 1
                # KEEP visible — don't redact description or amount
            else:
                redacted_txns += 1
                # REDACT: black out description and amount for this transaction
                for sp in all_spans:
                    if y_start - 10 <= sp["y"] <= y_end and sp["x0"] >= 140 and sp["x0"] < BALANCE_COL_X0:
                        rect = pymupdf.Rect(sp["bbox"][0] - 1, sp["bbox"][1] - 1,
                                             sp["bbox"][2] + 1, sp["bbox"][3] + 1)
                        page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))

    doc.save(output_path)
    doc.close()

    size_kb = os.path.getsize(output_path) / 1024
    print(f"  Visible: {kept} expense transactions")
    print(f"  Redacted: {redacted_txns} non-expense transactions")
    print(f"  Also redacted: all balances, account numbers, sort code, BIC, IBAN")
    print(f"  Saved: {basename} ({size_kb:.1f}KB)")

# ===== 3. VERIFY: Check what's visible in the redacted PDFs =====
print("\n" + "=" * 70)
print("VERIFICATION: Visible transactions in redacted PDFs")
print("=" * 70)

for pdf_path in pdf_files:
    basename = os.path.basename(pdf_path).replace('.pdf', '_REDACTED.pdf')
    output_path = os.path.join(output_dir, basename)
    if not os.path.exists(output_path):
        continue

    doc = pymupdf.open(output_path)
    print(f"\n--- {basename} ---")

    visible_txns = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        # Find date + vendor patterns that survived redaction
        for line in text.split('\n'):
            line = line.strip()
            if date_pattern.match(line):
                visible_txns.append(f"  p{page_num+1}: {line}")
            elif matches_expense(line) and len(line) > 3:
                visible_txns.append(f"  p{page_num+1}: {line}")

    for v in visible_txns[:30]:
        print(v)
    if len(visible_txns) > 30:
        print(f"  ... and {len(visible_txns) - 30} more")

    doc.close()

print("\nDone.")
