"""Restore original story names that were wrongly renamed in the MIRO_STORIES rewrite."""
import re

with open('build_v12_clean.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Only operate within the MIRO_STORIES block
start = content.find('MIRO_STORIES = [')
end_marker = "Accessibility Bible"
end_search = content.find(end_marker, start)
end = content.find(']', end_search) + 1
block = content[start:end]
before = content[:start]
after = content[end:]

fixes = 0

# 1. Critter NPCs - restore "(DONE)" prefix
for animal in ['Pigs', 'Cows', 'Chickens', 'Horses', 'Hares', 'Sheep']:
    old = f"('{animal}', 'Enemies Art'"
    new = f"('Critter NPCs - {animal} (DONE)', 'Enemies Art'"
    count = block.count(old)
    if count > 0:
        block = block.replace(old, new)
        fixes += count
        print(f"  Fixed: '{animal}' -> 'Critter NPCs - {animal} (DONE)' ({count} rows)")

# 2. Restore "System" suffix
renames = [
    ("('Gliding', 'Advanced Traversal'", "('Gliding System', 'Advanced Traversal'"),
    ("('Grappling', 'Advanced Traversal'", "('Grappling System', 'Advanced Traversal'"),
    ("('Locomotion', 'Basic Movement System'", "('Locomotion System', 'Basic Movement System'"),
    ("('Water', 'Navigation'", "('Water System', 'Navigation'"),
    ("('Player Environment', 'Basic Movement System'", "('Player Environment Interaction', 'Basic Movement System'"),
]
for old, new in renames:
    count = block.count(old)
    if count > 0:
        block = block.replace(old, new)
        fixes += count
        print(f"  Fixed: {old[:40]}... ({count} rows)")

# 3. Restore full Bible names
bible_renames = [
    ("'ENV Bible'", "'Environment Bible'"),
    ("'ANIM Bible'", "'Animation Bible'"),
    ("'CHAR Bible'", "'Character Bible'"),
    ("'CONCEPT Bible'", "'Concept Bible'"),
]
for old, new in bible_renames:
    count = block.count(old)
    if count > 0:
        block = block.replace(old, new)
        fixes += count
        print(f"  Fixed: {old} -> {new} ({count} rows)")

# 4. Restore "Ethnicity Variations" (not "Variants")
old = "'Ethnicity Variants'"
new = "'Ethnicity Variations'"
count = block.count(old)
if count > 0:
    block = block.replace(old, new)
    fixes += count
    print(f"  Fixed: {old} -> {new} ({count} rows)")

# 5. Faction entries: restore feature to 'Character Creation & Customization'
for faction_item in ['Faction: Icons', 'Faction: Insignias', 'Faction: Banners']:
    old = f"('{faction_item}', 'Enemies Art'"
    new = f"('{faction_item}', 'Character Creation & Customization'"
    count = block.count(old)
    if count > 0:
        block = block.replace(old, new)
        fixes += count
        print(f"  Fixed feature mapping: '{faction_item}' back to Char Creation ({count} rows)")

# 6. Restore Green/Red/Yellow/Blue Faction NPC Variants (these are DIFFERENT from Faction NPCs)
# Check if "Green Faction NPC Variants" already exists
if "'Green Faction NPC Variants'" not in block:
    # Add them back before the first EPIC 2 comment
    insert_point = block.find("# === RESTORED: Zone POI")
    if insert_point == -1:
        insert_point = block.find("# ====\n        # EPIC 2")
    if insert_point > 0:
        variant_entries = """        # -- Faction NPC Variants (player customization, distinct from Human NPCs) --
        ('Green Faction NPC Variants', 'Enemies Art', 'Art', 'Character Art', None, None),
        ('Red Faction NPC Variants', 'Enemies Art', 'Art', 'Character Art', None, None),
        ('Yellow Faction NPC Variants', 'Enemies Art', 'Art', 'Character Art', None, None),
        ('Blue Faction NPC Variants', 'Enemies Art', 'Art', 'Character Art', None, None),
"""
        block = block[:insert_point] + variant_entries + block[insert_point:]
        fixes += 4
        print(f"  Restored: 4 Faction NPC Variant entries")

content = before + block + after

with open('build_v12_clean.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal fixes applied: {fixes}")
