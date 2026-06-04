"""Fill in missing hours for Miro stories using extraction data."""

with open('build_v12_clean.py', 'r', encoding='utf-8') as f:
    content = f.read()

H = 7.0

# POI hours from _miro_master_extraction.txt
# Standard Medium POI pipeline total (all env art):
# Concept + World Building + Set Dressing + Terrain + Biome + Collision + Lighting + Rocking + NPC Lighting + Proxy
MED_POI_MIN = 20+80+80+20+40+40+20+40+40+80  # = 460h
MED_POI_MAX = 30+120+120+40+80+80+40+60+60+120  # = 750h

fixes = {
    # FTUE Zone POIs (from master extraction)
    # Cave: Concept 160-180h + medium pipeline
    ("'POI - Cave'", "None, None)"): f"round({160+80+80+20+40+40+20+40+40+80}/H,1), round({180+120+120+40+80+80+40+60+60+120}/H,1))",
    # Tower Exterior: Concept 80-120h + EPIC pipeline (World 240-360, Set 160-180)
    ("'POI - Tower Exterior'", "None, None)"): f"round({80+240+160+20+40+40+20+40+40+80}/H,1), round({120+360+180+40+80+80+40+60+60+120}/H,1))",
    # Big Battle Hill: Concept 80-120h + EPIC pipeline
    ("'POI - The Big Battle Hill'", "None, None)"): f"round({80+240+160+20+40+40+20+40+40+80}/H,1), round({120+360+180+40+80+80+40+60+60+120}/H,1))",
    # Cave Interior: Concept 20-30h + medium
    ("'POI - Cave Interior'", "None, None)"): f"round({20+80+80+20+40+40+20+40+40+80}/H,1), round({30+120+120+40+80+80+40+60+60+120}/H,1))",
    # New TBNL POIs
    # Waterfall Beauty: Concept 40-60h + Small (World 40-65, Set 40-65)
    ("'POI - Waterfall Beauty'", "None, None)"): f"round({40+40+40+20+40+40+20+40+40+80}/H,1), round({60+65+65+40+80+80+40+60+60+120}/H,1))",
    # Rope Bridge: Concept 40-60h + Medium
    ("'POI - Rope Bridge'", "None, None)"): f"round({40+80+80+20+40+40+20+40+40+80}/H,1), round({60+120+120+40+80+80+40+60+60+120}/H,1))",
    # Drifters Cross: Concept 160-200h + Small
    ("'POI - Drifters Cross (TBNL)'", "None, None)"): f"round({160+40+40+20+40+40+20+40+40+80}/H,1), round({200+65+65+40+80+80+40+60+60+120}/H,1))",
    # 10 Downtime POIs: all medium, Concept 20-30h
    ("'POI - Barracks'", "None, None)"): f"round({MED_POI_MIN}/H,1), round({MED_POI_MAX}/H,1))",
    ("'POI - Harbor'", "None, None)"): f"round({MED_POI_MIN}/H,1), round({MED_POI_MAX}/H,1))",
    ("'POI - House of Houses'", "None, None)"): f"round({MED_POI_MIN}/H,1), round({MED_POI_MAX}/H,1))",
    ("'POI - Marketplace'", "None, None)"): f"round({MED_POI_MIN}/H,1), round({MED_POI_MAX}/H,1))",
    ("'POI - Elevator Interior'", "None, None)"): f"round({MED_POI_MIN}/H,1), round({MED_POI_MAX}/H,1))",
    ("'POI - Elevator Top'", "None, None)"): f"round({MED_POI_MIN}/H,1), round({MED_POI_MAX}/H,1))",
    ("'POI - Tranquil Pond'", "None, None)"): f"round({MED_POI_MIN}/H,1), round({MED_POI_MAX}/H,1))",
    ("'POI - Lighthouse'", "None, None)"): f"round({MED_POI_MIN}/H,1), round({MED_POI_MAX}/H,1))",
    ("'POI - Housing District'", "None, None)"): f"round({MED_POI_MIN}/H,1), round({MED_POI_MAX}/H,1))",
    ("'POI - Marketplace 2'", "None, None)"): f"round({MED_POI_MIN}/H,1), round({MED_POI_MAX}/H,1))",
    # Biomes from master extraction (trees+bushes+grass+hero totals)
    # Mediterranean: Trees(259-470) + Bushes(138-181) + Grass(54-73) + Hero(153-229) + Cliff(232-289) = 836-1242h
    ("'Mediterranean Biome'", "None, None)"): f"round({259+138+54+153}/H,1), round({470+181+73+229}/H,1))",
    ("'Cliff - Mediterranean'", "None, None)"): f"round({232}/H,1), round({289}/H,1))",
    # Lush Biome: same structure as Mediterranean (no cliff) = 604-953h
    ("'Lush Biome'", "None, None)"): f"round({259+138+54+153}/H,1), round({470+181+73+229}/H,1))",
    # Dock - User Space Island from epics 4-10 extraction
    # World Building 80-120, Set Dressing 45-80, Concept 25-30, Terrain 12-16, Biome 40-80, Collision 6-8, Lighting 12-24, Masking 6-10, NPC Lighting 4-8, Proxy 10-12
    ("'Dock - User Space Island'", "None, None)"): f"round({80+45+25+12+40+6+12+6+4+10}/H,1), round({120+80+30+16+80+8+24+10+8+12}/H,1))",
}

count = 0
for (name_marker, old_suffix), new_suffix in fixes.items():
    # Find the line with this name and None, None
    search = f"{name_marker}"
    idx = content.find(search)
    while idx != -1:
        # Check if this line has None, None)
        line_end = content.find('\n', idx)
        line = content[idx:line_end]
        if old_suffix in line:
            content = content[:idx] + line.replace(old_suffix, new_suffix) + content[line_end:]
            count += 1
            print(f"  Fixed: {name_marker}")
            break
        idx = content.find(search, idx + 1)

with open('build_v12_clean.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal hours added: {count}")
