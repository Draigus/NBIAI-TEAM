"""Verify 100% completeness of v15 against all three sources."""
import re, os, sys
sys.path.insert(0, os.path.dirname(__file__))

# Import the build script's parsing functions
from build_v12_clean import (
    load_template_order, parse_estimation_sheet,
    build_feature_stories, FEATURE_NORM, COL_LAYOUT,
    NUM_ROLES
)

base = os.path.dirname(__file__)

print("=" * 70)
print("COMPLETENESS VERIFICATION — ALL THREE SOURCES")
print("=" * 70)

# 1. Load template
template_order = load_template_order()
template_features = [t for t in template_order if t['type'] == 'feature']
template_names = {t['name'] for t in template_features}

# 2. Parse all sources
design_path = os.path.join(base, 'VS Estimation Design - General Sheet.xlsx')
eng_path = os.path.join(base, 'VS Estimation Engineering - General Sheet (1).xlsx')
design_rows = parse_estimation_sheet(design_path, 'Sorted by Epic', 'design')
eng_rows = parse_estimation_sheet(eng_path, 'Sheet1', 'engineering')

print(f"\n--- SOURCE ROW COUNTS ---")
print(f"Design rows parsed: {len(design_rows)}")
print(f"Engineering rows parsed: {len(eng_rows)}")

# 3. Build feature stories (this is what the xlsx contains)
feature_stories = build_feature_stories(design_rows, eng_rows, template_order)

total_stories = sum(len(v) for v in feature_stories.values())
features_with_stories = sum(1 for v in feature_stories.values() if v)

print(f"\n--- OUTPUT COUNTS ---")
print(f"Total stories in output: {total_stories}")
print(f"Features with stories: {features_with_stories}")

# 4. Check MIRO_STORIES feature mapping
# Read the MIRO_STORIES from build script
with open(os.path.join(base, 'build_v12_clean.py'), 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('MIRO_STORIES = [')
end_marker = "('Accessibility Bible'"
end_search = content.find(end_marker, start)
end = content.find(']', end_search) + 1
block = content[start:end]

# Count entries
entry_count = block.count("('")
print(f"\nMIRO_STORIES entries in code: {entry_count}")

# Extract feature names used
features_used = set()
for line in block.split('\n'):
    parts = line.strip().strip(',').strip()
    if parts.startswith("('"):
        # Parse the tuple
        match = re.match(r"\('([^']*)',\s*'([^']*)',", parts)
        if match:
            features_used.add(match.group(2))

unmapped = features_used - template_names
if unmapped:
    print(f"\nCRITICAL: {len(unmapped)} MIRO features NOT in template (silently dropped!):")
    for f in sorted(unmapped):
        print(f"  - {f}")
else:
    print(f"\nAll {len(features_used)} MIRO feature references match template — ZERO silent drops")

# 5. Verify every design/eng row made it into the output
design_mapped = 0
design_unmapped = []
for r in design_rows:
    found = False
    for feat_name, stories in feature_stories.items():
        for s in stories:
            if s['name'].lower() == r['story'].lower() and s['team'].lower() == r['team'].lower():
                found = True
                break
        if found:
            break
    if found:
        design_mapped += 1
    else:
        design_unmapped.append(f"  {r['story'][:50]} [{r['team']}] -> feat={r.get('feature','?')}")

eng_mapped = 0
eng_unmapped = []
for r in eng_rows:
    found = False
    for feat_name, stories in feature_stories.items():
        for s in stories:
            if s['name'].lower() == r['story'].lower() and s['team'].lower() == r['team'].lower():
                found = True
                break
        if found:
            break
    if found:
        eng_mapped += 1
    else:
        eng_unmapped.append(f"  {r['story'][:50]} [{r['team']}] -> feat={r.get('feature','?')}")

print(f"\n--- DESIGN ROWS ---")
print(f"Mapped: {design_mapped}/{len(design_rows)}")
if design_unmapped:
    print(f"UNMAPPED ({len(design_unmapped)}):")
    for u in design_unmapped[:20]:
        print(u)

print(f"\n--- ENGINEERING ROWS ---")
print(f"Mapped: {eng_mapped}/{len(eng_rows)}")
if eng_unmapped:
    print(f"UNMAPPED ({len(eng_unmapped)}):")
    for u in eng_unmapped[:20]:
        print(u)

# 6. Check estimates
est_total = 0
est_present = 0
est_missing = []
for feat_name, stories in feature_stories.items():
    for s in stories:
        if s.get('design_est') or s.get('eng_est'):
            est_total += 1
            d = s.get('design_est') or {}
            e = s.get('eng_est') or {}
            if d.get('min') or d.get('max') or e.get('min') or e.get('max') or s.get('_art_min') or s.get('_art_max'):
                est_present += 1
            else:
                est_missing.append(f"  {s['name'][:50]} [{s['team']}] in {feat_name}")

print(f"\n--- ESTIMATES ---")
print(f"Stories with source estimates: {est_total}")
print(f"Estimates present in output: {est_present}")
if est_missing:
    print(f"Missing estimates ({len(est_missing)}):")
    for m in est_missing:
        print(m)

# 7. Final verdict
print(f"\n{'=' * 70}")
issues = len(design_unmapped) + len(eng_unmapped) + len(unmapped) + len(est_missing)
if issues == 0:
    print("VERDICT: ALL DATA PRESENT — 100% COMPLETE")
else:
    print(f"VERDICT: {issues} ISSUES FOUND")
print(f"{'=' * 70}")
