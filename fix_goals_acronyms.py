#!/usr/bin/env python3
"""
Fix Goals Studio task descriptions in WorkSage:
- Expand all acronyms on first use within each description/success_factor field
- Remove bad patterns (GG-, person names, 50% D1, 27-game, etc.)
"""

import json
import re
import requests
import sys

BASE_URL = "http://localhost:8888"

# --- Auth ---
def login():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": "glen", "password": "nbi2026"})
    r.raise_for_status()
    token = r.json()["token"]
    print(f"Logged in. Token: {token[:20]}...")
    return token

# --- Acronym expansion rules ---
# Each entry: (bare_acronym_pattern, expanded_form_including_acronym)
# Pattern is a regex that matches the bare acronym (word-boundary safe)
ACRONYMS = [
    # Order matters: longer/more specific first to avoid partial matches
    ("ARPPU", "Average Revenue Per Paying User (ARPPU)"),
    ("ARPU",  "Average Revenue Per User (ARPU)"),
    ("DAU",   "Daily Active Users (DAU)"),
    ("MAU",   "Monthly Active Users (MAU)"),
    ("FOMO",  "Fear of Missing Out (FOMO)"),
    ("F2P",   "Free-to-Play (F2P)"),
    ("FUT",   "FIFA Ultimate Team (FUT)"),
    ("FX",    "Foreign Exchange (FX)"),
    ("GDC",   "Game Developers Conference (GDC)"),
    ("HC",    "Hard Currency (HC)"),
    ("KSA",   "Kansspelautoriteit / Dutch gambling authority (KSA)"),
    ("NPS",   "Net Promoter Score (NPS)"),
    ("CPI",   "Cost Per Install (CPI)"),
    ("P2W",   "pay-to-win (P2W)"),
    ("PPP",   "Purchasing Power Parity (PPP)"),
    ("SKU",   "price tier (SKU)"),
    ("SOW",   "Statement of Work (SOW)"),
]

def expand_acronyms_first_use(text: str) -> tuple[str, list[str]]:
    """
    For each acronym, expand its FIRST occurrence in text.
    Subsequent occurrences remain as the bare acronym.
    Returns (modified_text, list_of_changes_made).
    """
    if not text:
        return text, []
    changes = []
    for acronym, expanded in ACRONYMS:
        # Match bare acronym as a whole word; NOT already inside parentheses like (HC)
        # Pattern: word boundary + acronym + word boundary, NOT preceded by '('
        pattern = r'(?<!\()\b' + re.escape(acronym) + r'\b'
        # Also skip if acronym is already expanded (i.e. "Hard Currency (HC)" already present)
        already_expanded_pattern = re.escape(expanded)
        if re.search(already_expanded_pattern, text):
            # Already expanded — skip
            continue
        match = re.search(pattern, text)
        if match:
            # Replace only the first occurrence
            new_text = text[:match.start()] + expanded + text[match.end():]
            changes.append(f"  Expanded {acronym} -> {expanded}")
            text = new_text
    return text, changes


# --- Bad pattern fixes ---
def fix_bad_patterns(text: str, field_name: str) -> tuple[str, list[str]]:
    """
    Remove/replace known bad patterns.
    Returns (modified_text, list_of_changes_made).
    """
    if not text:
        return text, []
    changes = []
    original = text

    # 1. GG-Monetization / GG- patterns → "Goals Studio"
    # Specific ones first
    replacements = [
        (r'\bGG-Monetization\b', 'Goals Studio Monetisation Design Doc'),
        (r'\bGG-Monetisation\b', 'Goals Studio Monetisation Design Doc'),
        (r'\bGG-([A-Za-z]+)\b', r'Goals Studio \1'),
        (r'\bGG\b', 'Goals Studio'),
    ]
    for pattern, repl in replacements:
        new_text = re.sub(pattern, repl, text)
        if new_text != text:
            changes.append(f"  Fixed GG- pattern in {field_name}")
            text = new_text

    # 2. "NBI 27-game" or "27 F2P launches" → rephrase
    patterns_27 = [
        (r"\bNBI['']?s?\s+27[-\s]game\s+principle\b", "NBI's launch pricing principle"),
        (r"\b27\s+(?:Free-to-Play \(F2P\)|F2P)\s+launches?\b", "multiple Free-to-Play (F2P) launches"),
        (r"\b27\s+launches?\b", "multiple launches"),
        (r"\bGlen's 27-game principle\b", "NBI's launch pricing principle"),
        (r"\b27-game\b", "multi-game"),
    ]
    for pattern, repl in patterns_27:
        new_text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
        if new_text != text:
            changes.append(f"  Fixed 27-game reference in {field_name}")
            text = new_text

    # 3. Person names (Glen Pryer, Devin Rieger, Tom Rieger) — remove unless context says client
    #    Jonas and Julius are clients — keep them
    #    Tom in "Tom reviews" = internal NBI — should not be named in task descriptions per brief
    #    Glen in "Glen reviews" = internal — remove
    name_patterns = [
        # "Glen reviews" → "NBI reviews" or just remove name
        (r'\bGlen(?:\s+Pryer)?\s+reviews?\b', 'NBI lead reviews'),
        (r'\bGlen(?:\s+Pryer)?\s+and\s+Tom\b', 'The NBI team'),
        (r'\bGlen(?:\s+Pryer)?\b', 'the NBI lead'),
        # Tom Rieger / Tom reviews — keep Tom only if no last name, as it could be client
        # But brief says Tom = NBI internal
        (r'\bTom\s+Rieger\b', 'the NBI team'),
        (r'\bDevin\s+Rieger\b', 'the NBI team'),
        # "Tom reviews" by itself — replace with role
        (r'\bTom\s+reviews?\b', 'the NBI team reviews'),
    ]
    for pattern, repl in name_patterns:
        new_text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
        if new_text != text:
            changes.append(f"  Removed person name in {field_name}: matched /{pattern}/")
            text = new_text

    # 4. "50% D1" → "34% D1"
    new_text = re.sub(r'\b50%\s+D1\b', '34% D1', text)
    if new_text != text:
        changes.append(f"  Fixed 50% D1 → 34% D1 in {field_name}")
        text = new_text

    return text, changes


def process_field(text: str, field_name: str) -> tuple[str, list[str]]:
    """Apply bad pattern fixes then acronym expansion."""
    if not text:
        return text, []
    all_changes = []
    text, bad_changes = fix_bad_patterns(text, field_name)
    all_changes.extend(bad_changes)
    text, acro_changes = expand_acronyms_first_use(text)
    all_changes.extend(acro_changes)
    return text, all_changes


# --- Main ---
def main():
    token = login()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Fetch all tasks
    r = requests.get(f"{BASE_URL}/api/tasks?limit=200&offset=0", headers=headers)
    r.raise_for_status()
    data = r.json()
    rows = data["rows"]
    print(f"Fetched {len(rows)} tasks total.")

    # Identify Goals tasks
    goals_prefixes = ('T1.', 'T2.', 'T3.', 'T4.', 'T5.',
                      'S1.', 'S2.', 'S3.', 'S4.', 'S5.',
                      'F1', 'F2', 'F3', 'F4', 'F5')
    goals_tasks = [
        t for t in rows
        if any(t.get('title', '').startswith(p) for p in goals_prefixes)
        or 'Goals Studio Pricing' in t.get('title', '')
        or t.get('title', '') == 'Goals Studio Pricing Engagement'
    ]
    print(f"Goals tasks identified: {len(goals_tasks)}\n")

    total_updated = 0
    total_changes = []

    for task in goals_tasks:
        task_id = task['id']
        title = task.get('title', '')
        desc_orig = task.get('description') or ''
        sf_orig = task.get('success_factor') or ''

        desc_new, desc_changes = process_field(desc_orig, 'description')
        sf_new, sf_changes = process_field(sf_orig, 'success_factor')

        if desc_new == desc_orig and sf_new == sf_orig:
            print(f"[NO CHANGE] {title[:60]}")
            continue

        # Build patch payload — only include changed fields
        patch = {}
        if desc_new != desc_orig:
            patch['description'] = desc_new
        if sf_new != sf_orig:
            patch['success_factor'] = sf_new

        # PATCH the task
        r = requests.patch(f"{BASE_URL}/api/tasks/{task_id}", json=patch, headers=headers)
        if r.status_code not in (200, 204):
            print(f"[ERROR] {title[:60]} — HTTP {r.status_code}: {r.text[:200]}")
            continue

        print(f"[UPDATED] {title[:60]}")
        all_changes = desc_changes + sf_changes
        for c in all_changes:
            print(c)
        total_changes.extend(all_changes)
        total_updated += 1

    print(f"\n{'='*60}")
    print(f"SUMMARY: {total_updated} tasks updated, {len(total_changes)} changes made.")
    print(f"{'='*60}")
    return total_updated, goals_tasks, headers, token


# --- Verification pass ---
def verify(token, goals_task_ids):
    headers = {"Authorization": f"Bearer {token}"}

    # Re-login if needed — token may still be valid
    r = requests.get(f"{BASE_URL}/api/tasks?limit=200", headers=headers)
    if r.status_code == 401:
        token = login()
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(f"{BASE_URL}/api/tasks?limit=200", headers=headers)
    r.raise_for_status()
    rows = r.json()["rows"]

    goals_prefixes = ('T1.', 'T2.', 'T3.', 'T4.', 'T5.',
                      'S1.', 'S2.', 'S3.', 'S4.', 'S5.',
                      'F1', 'F2', 'F3', 'F4', 'F5')
    goals_tasks = [
        t for t in rows
        if any(t.get('title', '').startswith(p) for p in goals_prefixes)
        or 'Goals Studio Pricing' in t.get('title', '')
        or t.get('title', '') == 'Goals Studio Pricing Engagement'
    ]

    print(f"\n{'='*60}")
    print("VERIFICATION PASS")
    print(f"{'='*60}")

    # Acronyms to check — bare form should not appear without expansion on first use
    # We check: does the bare acronym appear BEFORE its expanded form in the field?
    bare_acronyms = [a[0] for a in ACRONYMS]

    bad_patterns_check = [
        (r'\bGG-\w+', "GG- prefix"),
        (r'\b27-game\b', "27-game reference"),
        (r'\bNBI 27\b', "NBI 27 reference"),
        (r'\b27 F2P\b', "27 F2P reference"),
        (r'\bGlen Pryer\b', "Glen Pryer name"),
        (r'\bDevin Rieger\b', "Devin Rieger name"),
        (r'\bTom Rieger\b', "Tom Rieger name"),
        (r'\b50% D1\b', "50% D1 (should be 34%)"),
    ]

    issues_found = []

    for task in goals_tasks:
        title = task.get('title', '')
        for field_name in ('description', 'success_factor'):
            text = task.get(field_name) or ''
            if not text:
                continue

            # Check for unexpanded acronyms on first use
            for acronym, expanded in ACRONYMS:
                # Find first occurrence of bare acronym
                bare_pattern = r'(?<!\()\b' + re.escape(acronym) + r'\b'
                bare_match = re.search(bare_pattern, text)
                if bare_match:
                    # Check if expanded form appears before this
                    expanded_match = re.search(re.escape(expanded), text)
                    if not expanded_match or expanded_match.start() > bare_match.start():
                        issues_found.append(
                            f"  ISSUE [{title[:50]}] {field_name}: '{acronym}' not expanded on first use at pos {bare_match.start()}"
                        )

            # Check bad patterns
            for pattern, label in bad_patterns_check:
                if re.search(pattern, text, re.IGNORECASE):
                    issues_found.append(
                        f"  ISSUE [{title[:50]}] {field_name}: bad pattern '{label}' found"
                    )

    if issues_found:
        print(f"ISSUES FOUND ({len(issues_found)}):")
        for issue in issues_found:
            print(issue)
    else:
        print("ALL CLEAR — zero unexpanded acronyms on first use, zero bad patterns.")

    return issues_found


if __name__ == "__main__":
    updated, goals_tasks, headers, token = main()
    issues = verify(token, [t['id'] for t in goals_tasks])
    if issues:
        print(f"\nWARNING: {len(issues)} issues remain after update pass.")
        sys.exit(1)
    else:
        print("\nDone. All Goals tasks cleaned and verified.")
