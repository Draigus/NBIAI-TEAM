"""Identify net new Miro stories not already in estimation sheets."""
import sys
sys.path.insert(0, '.')
from build_v12_clean import parse_estimation_sheet, build_feature_stories, load_template_order

d = parse_estimation_sheet('VS Estimation Design - General Sheet.xlsx', 'Sorted by Epic', False)
e = parse_estimation_sheet('VS Estimation Engineering - General Sheet (1).xlsx', 'Sheet1', True)
template_order = load_template_order()
fs = build_feature_stories(d, e, template_order)

existing = set()
for feat, stories in fs.items():
    for s in stories:
        existing.add(s['name'].lower().strip())

print(f'Existing stories: {len(existing)}')

# All Miro stories: (name, template_feature, dept, team, min_days, max_days)
miro_stories = [
    # Player Build
    ('Faction: Clothing Variations', 'Character Creation & Customization', 'Art', 'Character Art', None, None),
    ('Faction: Banners', 'Character Creation & Customization', 'Art', 'Concept Art', None, None),
    ('Faction: Icons', 'Character Creation & Customization', 'Art', 'Concept Art', None, None),
    ('Faction: Insignias', 'Character Creation & Customization', 'Art', 'Concept Art', None, None),
    ('Garment System Options', 'Garment System', 'Art', 'Character Art', None, None),
    ('Garment Sets', 'Garment System', 'Art', 'Character Art', None, None),
    ('Weapon Sets', 'Garment System', 'Art', 'Character Art', None, None),
    ('Weapon Parts', 'Garment System', 'Art', 'Character Art', None, None),
    ('Armour Sets', 'Garment System', 'Art', 'Character Art', None, None),
    ('Partner Skins', 'Garment System', 'Art', 'Character Art', None, None),
    ('Skins', 'Garment System', 'Art', 'Character Art', None, None),
    ('Base Body (MVP DONE)', 'Character Creation & Customization', 'Art', 'Character Art', None, None),
    ('Base Faces (MVP DONE)', 'Character Creation & Customization', 'Art', 'Character Art', None, None),
    ('Fantasy Races', 'Character Creation & Customization', 'Art', 'Character Art', None, None),
    ('Ethnicity Variations', 'Character Creation & Customization', 'Art', 'Character Art', None, None),
    ('Gathering', 'Professions', 'Design', 'Game design', None, None),
    ('Crafting', 'Professions', 'Design', 'Game design', None, None),
    ('Trophies', 'Achievements & Trophies', 'Art', 'Concept Art', None, None),
    ('Char Creation System', 'Character Creation & Customization', 'Art', 'Character Art', None, None),
    # World Systems ENV
    ('Mediterranean Biome', 'Biome - Portal Peak', 'Art', 'Environment Art', None, None),
    ('Lush Biome', 'Biome - Farmlands', 'Art', 'Environment Art', None, None),
    ('Lighting Tech', 'Navigation', 'Art', 'Environment Art', None, None),
    ('Atmospherics', 'Navigation', 'Art', 'Environment Art', None, None),
    ('Water System', 'Navigation', 'Art', 'Environment Art', None, None),
    ('VFX Tech', 'Foam Corruption', 'Art', 'VFX', None, None),
    ('Env Prop Kit - Tavern', 'Biome - Downtime', 'Art', 'Environment Art', None, None),
    ('Fluid Ninja Tech R&D', 'Foam Corruption', 'Art', 'TechArt', None, None),
    # World Systems REST - NPCs
    ('Green Faction NPCs', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Red Faction NPCs', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Yellow Faction NPCs', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Blue Faction NPCs', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Critter NPCs - Pigs (DONE)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Critter NPCs - Hares (DONE)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Critter NPCs - Sheep (DONE)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Critter NPCs - Cows (DONE)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Critter NPCs - Chickens (DONE)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Critter NPCs - Horses (DONE)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Hero NPC - Xyron (Upgrade)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Hero NPC - Barbersmith (Upgrade)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Hero NPC - Maeve/Mayor (Upgrade)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Gliding System', 'Advanced Traversal', 'Art', 'Animation & Rigging', None, None),
    ('Grappling System', 'Advanced Traversal', 'Art', 'Animation & Rigging', None, None),
    # User Space
    ('Indoor Camera', 'User Space Decoration', 'Engineering', 'Gameplay Engineering', None, None),
    ('User Space Interior', 'User Space Decoration', 'Art', 'Environment Art', None, None),
    ('User Space Exterior', 'User Space Decoration', 'Art', 'Environment Art', None, None),
    ('Zone - User Space Island', 'User Space Server & Instance', 'Art', 'Environment Art', None, None),
    ('Modular Houses', 'Building Houses', 'Art', 'Environment Art', None, None),
    # Items & Inventory
    ('Potions', 'Consumables', 'Art', 'Concept Art', None, None),
    ('MECH PARROT', 'Mounts / Pets', 'Art', 'Character Art', None, None),
    # Quest System
    ('Lock Picking Quest', 'Quest Types - Courier / Escort / Kill / Collect / Mystery / Time / Partner / Lockpicking', 'Design', 'Game design', None, None),
    ('Hearthstone (Return Home Stone)', 'Quest Reward System', 'Art', 'Concept Art', None, None),
    ('Partner Crystal', 'Quest Reward System', 'Art', 'Concept Art', None, None),
    # Player Economy
    ('Currency System Art', 'Currency System', 'Art', 'Concept Art', None, None),
    ('Bugged Dungeon Shop', 'Dungeon Mechanics', 'Art', 'Environment Art', None, None),
    # Game Bibles (with hour estimates, converted at 7h/day)
    ('Colour Palette', 'Brand Bible', 'Art', 'Concept Art', 5.7, 8.6),
    ('Typography', 'Brand Bible', 'Art', 'Concept Art', 5.7, 8.6),
    ('Wireframes', 'UX/UI Bible', 'Art', 'UX/UI', 5.7, 8.6),
    ('Game Logo', 'Brand Bible', 'Art', 'Concept Art', 11.4, 14.3),
    ('Environment Bible', 'Art Bible', 'Art', 'Environment Art', None, None),
    ('Animation Bible', 'Art Bible', 'Art', 'Animation & Rigging', None, None),
    ('Character Bible', 'Art Bible', 'Art', 'Character Art', None, None),
    ('VFX Bible', 'Art Bible', 'Art', 'VFX', None, None),
    ('Concept Bible', 'Art Bible', 'Art', 'Concept Art', None, None),
]

new_stories = []
already = []
for name, feat, dept, team, mn, mx in miro_stories:
    if name.lower().strip() in existing:
        already.append(name)
    else:
        new_stories.append((name, feat, dept, team, mn, mx))

print(f'Miro stories total: {len(miro_stories)}')
print(f'Already in estimation sheets: {len(already)}')
if already:
    for a in already:
        print(f'  SKIP: {a}')
print(f'NEW stories to add: {len(new_stories)}')
for name, feat, dept, team, mn, mx in new_stories:
    est = f' ({mn}-{mx}d)' if mn else ''
    print(f'  ADD: [{feat[:30]:30}] {name}{est}')
