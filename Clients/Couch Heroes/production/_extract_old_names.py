"""Extract original MIRO_STORIES names from git committed version."""
import subprocess, re

result = subprocess.run(['git', 'show', 'HEAD:Clients/Couch Heroes/production/build_v12_clean.py'],
                       capture_output=True, text=True, encoding='utf-8',
                       cwd=r'D:\OneDrive\Claude_code\NBIAI_TEAM')
content = result.stdout

start = content.find('MIRO_STORIES = [')
if start == -1:
    print('No MIRO_STORIES in committed version')
    exit()

end_marker = "Accessibility Bible"
end_search = content.find(end_marker, start)
end = content.find(']', end_search)
block = content[start:end]

pattern = re.compile(r"\('([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'")
print("OLD MIRO_STORIES (committed version):")
print("-" * 80)
for line in block.split('\n'):
    m = pattern.search(line)
    if m:
        print(f"{m.group(1)} | {m.group(2)} | {m.group(3)} | {m.group(4)}")
