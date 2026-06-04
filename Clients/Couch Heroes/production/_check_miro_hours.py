"""Check which Miro stories have hours vs are blank."""
import re

with open('build_v12_clean.py', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('MIRO_STORIES = [')
end = content.find(']', content.find('Accessibility Bible', start)) + 1
block = content[start:end]

has_hours = 0
no_hours = 0
no_hours_list = []

pattern = re.compile(r"\('([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',")

for line in block.split('\n'):
    line = line.strip().rstrip(',')
    if not line.startswith("('"):
        continue
    if 'None, None)' in line:
        no_hours += 1
        m = pattern.match(line)
        if m:
            no_hours_list.append(f"  {m.group(1)[:50]:50s} [{m.group(4)}]")
    else:
        has_hours += 1

print(f"=== MIRO STORIES HOUR COVERAGE ===")
print(f"With hours: {has_hours}")
print(f"Without hours (None, None): {no_hours}")
print(f"Total: {has_hours + no_hours}")
print(f"Coverage: {has_hours/(has_hours+no_hours)*100:.1f}%")
print(f"\nStories WITHOUT hours:")
for s in no_hours_list:
    print(s)
