"""Compare fresh Miro extraction against v15 to find missing stories."""
import sys
sys.path.insert(0, '.')
from build_v12_clean import parse_estimation_sheet, build_feature_stories, load_template_order

d = parse_estimation_sheet('VS Estimation Design - General Sheet.xlsx', 'Sorted by Epic', False)
e = parse_estimation_sheet('VS Estimation Engineering - General Sheet (1).xlsx', 'Sheet1', True)
template_order = load_template_order()
fs = build_feature_stories(d, e, template_order)

# All story names currently in v15 (lowercase for comparison)
existing = set()
for feat, stories in fs.items():
    for s in stories:
        existing.add(s['name'].lower().strip())

print(f'Stories in v15: {len(existing)}')

# Every named story from the fresh Miro extraction
# (name, template_feature, dept, team, min_hours, max_hours)
ALL_MIRO_STORIES = [
    # === PLAYER BUILD ===
    ('Base Body (MVP DONE)', 'Character Creation & Customization', 'Art', 'Character Art', None, None),
    ('Base Faces (MVP DONE)', 'Character Creation & Customization', 'Art', 'Character Art', None, None),
    ('Ethnicity Variants', 'Character Creation & Customization', 'Art', 'Character Art', None, None),
    ('Race Variants', 'Character Creation & Customization', 'Art', 'Character Art', None, None),
    ('Faction: Clothing Variations', 'Character Creation & Customization', 'Art', 'Character Art', None, None),
    ('Faction: Banners', 'Character Creation & Customization', 'Art', 'Concept Art', None, None),
    ('Faction: Icons', 'Character Creation & Customization', 'Art', 'Concept Art', None, None),
    ('Faction: Insignias', 'Character Creation & Customization', 'Art', 'Concept Art', None, None),
    ('Armour Sets', 'Garment System', 'Art', 'Character Art', None, None),
    ('Weapon Sets', 'Garment System', 'Art', 'Character Art', None, None),
    ('Garment Sets', 'Garment System', 'Art', 'Character Art', None, None),
    ('Garment System Options', 'Garment System', 'Art', 'Character Art', None, None),
    ('Weapon Parts', 'Garment System', 'Art', 'Character Art', None, None),
    ('Partner Skins', 'Garment System', 'Art', 'Character Art', None, None),
    ('Skins', 'Garment System', 'Art', 'Character Art', None, None),
    ('Char Creation System', 'Character Creation & Customization', 'Art', 'Character Art', None, None),
    ('Gathering', 'Professions', 'Design', 'Game design', None, None),
    ('Crafting', 'Professions', 'Design', 'Game design', None, None),
    ('Trophies', 'Achievements & Trophies', 'Art', 'Concept Art', None, None),
    ('Green Faction NPC Variants', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Red Faction NPC Variants', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Yellow Faction NPC Variants', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Blue Faction NPC Variants', 'Enemies Art', 'Art', 'Character Art', None, None),

    # === WORLD SYSTEMS ENV ===
    ('FTUE Cave POI Development', 'FTUE', 'Art', 'Environment Art', None, None),
    ('Downtime Zone POI and Dressing', 'Biome - Downtime', 'Art', 'Environment Art', None, None),
    ('Portal Dimension Zone POI', 'Biome - Portal Peak', 'Art', 'Environment Art', None, None),
    ('Arena Zone POI Development', 'PvP Combat', 'Art', 'Environment Art', None, None),
    ('Guild Zone POI and Dressing', 'Guilds', 'Art', 'Environment Art', None, None),
    ('User Space Island Zone Development', 'User Space Server & Instance', 'Art', 'Environment Art', None, None),
    ('Lighting System', 'Navigation', 'Art', 'Environment Art', None, None),
    ('Weather System', 'Dynamic Weather', 'Art', 'Environment Art', None, None),
    ('Atmospherics System', 'Navigation', 'Art', 'Environment Art', None, None),
    ('Water System', 'Navigation', 'Art', 'Environment Art', None, None),
    ('VFX Tech System', 'Foam Corruption', 'Art', 'VFX', None, None),
    ('Fog System', 'Navigation', 'Art', 'Environment Art', None, None),
    ('Mediterranean Biome', 'Biome - Portal Peak', 'Art', 'Environment Art', None, None),
    ('Lush Biome', 'Biome - Farmlands', 'Art', 'Environment Art', None, None),
    ('Mythcore Architecture Kit', 'Biome - Portal Peak', 'Art', 'Environment Art', None, None),
    ('Mythcore Ruins Architecture Kit', 'Biome - Portal Peak', 'Art', 'Environment Art', None, None),
    ('Graveyard Architecture Kit', 'Biome - Portal Peak', 'Art', 'Environment Art', None, None),
    ('Fantasy Architecture Kit', 'Biome - Portal Peak', 'Art', 'Environment Art', None, None),
    ('Guild Hall Architecture Kit', 'Guilds', 'Art', 'Environment Art', None, None),
    ('Arena Architecture Kit', 'PvP Combat', 'Art', 'Environment Art', None, None),
    ('Gritcore Props Kit', 'Biome - Portal Peak', 'Art', 'Environment Art', None, None),
    ('Fantasy Exterior Props Kit', 'Biome - Portal Peak', 'Art', 'Environment Art', None, None),
    ('Fantasy Furniture Kit', 'User Space Decoration', 'Art', 'Environment Art', None, None),
    ('Graveyard Furniture Kit', 'Biome - Portal Peak', 'Art', 'Environment Art', None, None),
    ('Gritcore Furniture Kit', 'User Space Decoration', 'Art', 'Environment Art', None, None),
    ('Mythcore Furniture Kit', 'Biome - Portal Peak', 'Art', 'Environment Art', None, None),
    ('Bug Dungeon Furniture Kit', 'Dungeon Mechanics', 'Art', 'Environment Art', None, None),
    ('Env Prop Kit - Tavern', 'Biome - Downtime', 'Art', 'Environment Art', None, None),
    ('Maps', 'Navigation', 'Art', 'UX/UI', None, None),
    ('Navigation Elements', 'Navigation', 'Art', 'UX/UI', None, None),
    ('Foam Corruption Art', 'Foam Corruption', 'Art', 'Environment Art', None, None),
    ('Time Corruption Art', 'Foam Corruption', 'Art', 'Environment Art', None, None),
    ('Vines Corruption Art', 'Foam Corruption', 'Art', 'Environment Art', None, None),
    ('Fluid Ninja Tech R&D', 'Foam Corruption', 'Art', 'TechArt', None, None),

    # === WORLD SYSTEMS REST ===
    ('Hero NPC - Xyron (Upgrade)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Hero NPC - Barbersmith (Upgrade)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Hero NPC - Maeve/Mayor (Upgrade)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Hero NPC - Green Faction', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Critter NPCs - Pigs (DONE)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Critter NPCs - Hares (DONE)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Critter NPCs - Sheep (DONE)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Critter NPCs - Cows (DONE)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Critter NPCs - Chickens (DONE)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Critter NPCs - Horses (DONE)', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Locomotion System', 'Basic Movement System', 'Art', 'Animation & Rigging', None, None),
    ('Gliding System', 'Advanced Traversal', 'Art', 'Animation & Rigging', None, None),
    ('Grappling System', 'Advanced Traversal', 'Art', 'Animation & Rigging', None, None),
    ('Generic NPC', 'Enemies Art', 'Art', 'Character Art', None, None),
    ('Player Environment Interaction', 'Basic Movement System', 'Design', 'Game design', None, None),
    ('FMV/Pre-Rendered Cinematics', 'Full Motion Video (FMV)', 'Art', 'Environment Art', None, None),
    ('Static Pictures Intro + Voiceover', 'Full Motion Video (FMV)', 'Art', 'Concept Art', None, None),
    ('2.5D Cinematics', 'In Game Cinematic (IGC)', 'Art', 'Concept Art', None, None),
    ('IGC (In Game Cinematics)', 'In Game Cinematic (IGC)', 'Art', 'Animation & Rigging', None, None),

    # === COMBAT ===
    ('Magic System Art', 'Magic', 'Art', 'VFX', None, None),
    ('Player Combat Abilities Art', 'Combat Abilities', 'Art', 'VFX', None, None),
    ('Combat Hit & Damage Processing', 'Combat Framework', 'Art', 'VFX', None, None),

    # === USER SPACE ===
    ('Indoor Camera', 'User Space Decoration', 'Engineering', 'Gameplay Engineering', None, None),
    ('User Space Interior', 'User Space Decoration', 'Art', 'Environment Art', None, None),
    ('User Space Exterior', 'User Space Decoration', 'Art', 'Environment Art', None, None),
    ('Zone - User Space Island', 'User Space Server & Instance', 'Art', 'Environment Art', None, None),
    ('Modular Houses', 'Building Houses', 'Art', 'Environment Art', None, None),

    # === ITEMS & INVENTORY ===
    ('Potions', 'Consumables', 'Art', 'Concept Art', None, None),
    ('MECH PARROT', 'Mounts / Pets', 'Art', 'Character Art', None, None),
    ('Banks Exterior', 'Banks', 'Art', 'Environment Art', None, None),

    # === QUEST SYSTEM ===
    ('Lock Picking Quest', 'Quest Types - Courier / Escort / Kill / Collect / Mystery / Time / Partner / Lockpicking', 'Design', 'Game design', None, None),
    ('Hearthstone (Return Home Stone)', 'Quest Reward System', 'Art', 'Concept Art', None, None),
    ('Partner Crystal', 'Quest Reward System', 'Art', 'Concept Art', None, None),

    # === PLAYER ECONOMY ===
    ('Currency System Art', 'Currency System', 'Art', 'Concept Art', None, None),
    ('Bugged Dungeon Shop', 'Dungeon Mechanics', 'Art', 'Environment Art', None, None),

    # === GAME BIBLES (with hours at 7h/day) ===
    ('Colour Palette', 'Brand Bible', 'Art', 'Concept Art', 40, 60),
    ('Typography', 'Brand Bible', 'Art', 'Concept Art', 40, 60),
    ('Wireframes', 'UX/UI Bible', 'Art', 'UX/UI', 40, 60),
    ('Game Logo', 'Brand Bible', 'Art', 'Concept Art', 80, 100),
    ('ENV Bible', 'Art Bible', 'Art', 'Environment Art', 80, 100),
    ('ANIM Bible', 'Art Bible', 'Art', 'Animation & Rigging', 80, 100),
    ('CHAR Bible', 'Art Bible', 'Art', 'Character Art', 80, 100),
    ('VFX Bible', 'Art Bible', 'Art', 'VFX', 80, 100),
    ('CONCEPT Bible', 'Art Bible', 'Art', 'Concept Art', 80, 100),
    ('Accessibility Bible', 'Accessibility Guidelines', 'Art', 'UX/UI', None, None),
]

new = []
already = []
for name, feat, dept, team, min_h, max_h in ALL_MIRO_STORIES:
    if name.lower().strip() in existing:
        already.append(name)
    else:
        new.append((name, feat, dept, team, min_h, max_h))

print(f'\nMiro stories checked: {len(ALL_MIRO_STORIES)}')
print(f'Already in v15: {len(already)}')
for a in already:
    print(f'  SKIP: {a}')
print(f'\nNEW to add: {len(new)}')
for name, feat, dept, team, min_h, max_h in new:
    est = f' ({min_h}-{max_h}h)' if min_h else ''
    print(f'  ADD: [{feat[:35]:35}] {name}{est} [{dept} | {team}]')
