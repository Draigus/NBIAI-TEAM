import json, re, html, os, sys
import openpyxl

base = r'C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI-TEAM\d41e7002-7785-4c2a-ba67-02f379183b49\tool-results'

shapes = []
for f in ['mcp-claude_ai_Miro-board_list_items-1777998367328.txt',
          'mcp-claude_ai_Miro-board_list_items-1777998983493.txt',
          'mcp-claude_ai_Miro-board_list_items-1777998996501.txt',
          'mcp-claude_ai_Miro-board_list_items-1777999013112.txt']:
    shapes.extend(json.load(open(os.path.join(base, f), encoding='utf-8'))['data'])

stickies = json.load(open(os.path.join(base, 'mcp-claude_ai_Miro-board_list_items-1777998158578.txt'), encoding='utf-8'))['data']
texts = json.load(open(os.path.join(base, 'mcp-claude_ai_Miro-board_list_items-1777998375179.txt'), encoding='utf-8'))['data']

def strip_html(s):
    if not s: return ''
    s = re.sub(r'<br\s*/?>', ' ', s)
    s = re.sub(r'<[^>]+>', '', s)
    return html.unescape(s).strip()

def get_color(item):
    style = item.get('style') or {}
    return (style.get('fillColor') or style.get('backgroundColor') or '').lower()

def get_pos(item):
    pos = item.get('position') or {}
    geo = item.get('geometry') or {}
    return pos.get('x', 0), pos.get('y', 0), geo.get('width', 0), geo.get('height', 0)

def get_content(item):
    c = item.get('content') or ''
    if not c:
        d = item.get('data') or {}
        c = d.get('content') or ''
    return strip_html(c)

# === FIND FEATURES ===
feat_colors = {'light_yellow','orange','dark_blue','light_blue','green','light_green','yellow','gray','grey'}
features = []
for item in stickies:
    color = get_color(item)
    content = get_content(item)
    x, y, w, h = get_pos(item)
    if color in feat_colors and 12000 < y < 28000 and w > 500 and len(content) > 2:
        features.append({'content': content, 'color': color, 'x': x, 'y': y, 'w': w, 'h': h})

# === FIND GREY ESTIMATE BOXES ===
grey_set = {'#e7e7e7','#b0b0b0','#d3d3d3','#c0c0c0','#a9a9a9','#e6e6e6','#cccccc','#f5f5f5','gray','grey','#808080','#ebebeb','#d9d9d9'}
grey_boxes = []
for item in shapes + stickies + texts:
    color = get_color(item)
    content = get_content(item)
    x, y, w, h = get_pos(item)
    is_grey = color in grey_set
    has_days = bool(re.search(r'\d+\s*[dD](?:\b|[)\s,\-])', content))
    has_estimate = bool(re.search(r'designer|engineer|concept|props|layout|anim|vfx|audio|rigging|UI|tech art|blockout|narrative|enviro', content, re.I))
    if is_grey and (has_days or has_estimate) and 12000 < y < 30000:
        grey_boxes.append({'content': content, 'color': color, 'x': x, 'y': y, 'w': w, 'h': h})

# === FIND RED / NOT FOR VS ===
red_feature_positions = []
for item in stickies + shapes:
    color = get_color(item)
    content = get_content(item)
    x, y, w, h = get_pos(item)
    if 12000 < y < 28000:
        is_red = color in ('red', '#bd0a0a', '#b71c1c', '#e65100')
        has_not_vs = 'not for vs' in content.lower() or 'not for vertical' in content.lower()
        if is_red or has_not_vs:
            red_feature_positions.append({'x': x, 'y': y, 'content': content})

# === MATCH GREY BOXES TO FEATURES ===
def match_grey_to_feature(gb, features):
    best = None
    best_score = float('inf')
    gx, gy = gb['x'], gb['y']
    for feat in features:
        fx, fy = feat['x'], feat['y']
        x_dist = abs(fx - gx)
        y_dist = fy - gy
        if x_dist < 800 and 0 < y_dist < 1500:
            score = x_dist * 2 + y_dist
            if score < best_score:
                best_score = score
                best = feat
    return best

matches = []
for gb in grey_boxes:
    feat = match_grey_to_feature(gb, features)
    if feat:
        matches.append({'feature': feat['content'], 'estimate': gb['content'],
                       'feat_x': feat['x'], 'feat_y': feat['y']})

# === PARSE DISCIPLINE DAYS ===
def parse_days(content):
    roles = {}
    patterns = [
        (r'designer\s*\((\d+)[dD]\)', 'Game Designer'),
        (r'engineer\s*\(?(\d+)[dD]\)?', 'Gameplay Developer'),
        (r'UI\s*\(?(\d+)[dD]\)?', 'UI/UX Designer'),
        (r'UI\s+(\d+)d\b', 'UI/UX Designer'),
        (r'VFX\s*\(?(\d+)[dD]\)?', 'VFX Artist'),
        (r'VFX\s+(\d+)d\b', 'VFX Artist'),
        (r'[Aa]udio\s*\(?(\d+)[dD]\)?', 'Sound Designer'),
        (r'[Pp]rops?\s*\(?(\d+)[dD]\)?', 'Prop Artist'),
        (r'[Pp]rops?\s+(\d+)d\b', 'Prop Artist'),
        (r'[Aa]nim\s*\(?(\d+)[dD]\)?', 'Animator'),
        (r'[Aa]nim\s+(\d+)d\b', 'Animator'),
        (r'[Tt]ech\s*[Aa]rt\s*\(?(\d+)[dD]\)?', 'Technical Artist'),
        (r'[Tt]ech\s*[Aa]rt\s+(\d+)d\b', 'Technical Artist'),
        (r'[Tt]ech[Aa]rt\s*\(?(\d+)[dD]\)?', 'Technical Artist'),
        (r'[Cc]oncept\s*\(?(\d+)[dD]?\)?', 'Concept Artist'),
        (r'[Cc]oncept\s+(\d+)\b', 'Concept Artist'),
        (r'[Ee]nviro?\s*\(?(\d+)[dD]\)?', 'Environment Artist'),
        (r'[Ee]nv\s*(?:art)?\s*\(?(\d+)[dD]\)?', 'Environment Artist'),
        (r'[Ll]vl\s+design\s*\(?(\d+)[dD]\)?', 'Level Designer'),
        (r'[Ll]evel\s+[Dd]esign\s*\(?(\d+)[dD]\)?', 'Level Designer'),
        (r'[Bb]lockout\s*\(?(\d+)[dD]\)?', 'Level Designer'),
        (r'[Bb]lockout\s+(\d+)d\b', 'Level Designer'),
        (r'[Ll]ayout\s*\(?(\d+)[dD]\)?', 'Level Designer'),
        (r'[Ll]ayout\s+(\d+)d\b', 'Level Designer'),
        (r'[Nn]arrative\s*\(?(\d+)[dD]\)?', 'Writer'),
        (r'[Nn]arrative\((\d+)[dD]\)', 'Writer'),
        (r'[Rr]igging\s*\(?(\d+)[dD]?\)?', 'Character Rigger'),
        (r'[Rr]igging\s+(\d+)\b', 'Character Rigger'),
        (r'[Tt]ech\s+[Aa]nim\s*\(?(\d+)[dD]\)?', 'Character Rigger'),
        (r'[Tt]ech\s+[Aa]nim\s+(\d+)d\b', 'Character Rigger'),
        (r'[Cc]ombat\s+[Dd]esign(?:er)?\s*\(?(\d+)[dD]\)?', 'Combat Designer'),
        (r'[Cc]ombat\s+[Dd]esign\s+(\d+)d\b', 'Combat Designer'),
        (r'[Cc]har\s*(?:art)?\s*\(?(\d+)[dD]?\)?', 'Character Artist'),
        (r'[Cc]har\s+(\d+)d?\b', 'Character Artist'),
        (r'[Ff]oliage\s*\(?(\d+)[dD]\)?', 'Environment Artist'),
        (r'[Ff]oliage\s+(\d+)d\b', 'Environment Artist'),
        (r'GD\s*\(?(\d+)[dD]\)?', 'Game Director'),
        (r'GD\+CD\s*\(?(\d+)[dD]\)?', 'Game Director'),
        (r'CD\s*\(?(\d+)[dD]\)?', 'Combat Designer'),
        (r'economy\s+designer\s*\(?(\d+)[dD]\)?', 'Game Designer'),
        (r'commerce\s+designer[/\w]*\s*\(?(\d+)[dD]\)?', 'Game Designer'),
        (r'rod\s+(\d+)[dD]', 'Prop Artist'),
        (r'sign\s+(\d+)[dD]', 'Prop Artist'),
        (r'fish\s+(\d+)[dD]', 'Prop Artist'),
        (r'table\s+(\d+)[dD]', 'Prop Artist'),
        (r'modeling\s+\w+\s+(\d+)[dD]', 'Prop Artist'),
        (r'[Dd]esign\s*\((\d+)[dD]\)', 'Game Designer'),
        (r'[Dd]esign\s+(\d+)d\b', 'Game Designer'),
    ]

    for pattern, role in patterns:
        for m in re.finditer(pattern, content):
            try:
                days = int(m.group(1))
                roles[role] = roles.get(role, 0) + days
            except (ValueError, IndexError):
                pass

    return roles

# === BUILD FEATURE -> ROLES MAPPING ===
feature_hours = {}
for m in matches:
    feat_name = m['feature'].split('\n')[0].strip()
    roles = parse_days(m['estimate'])
    if feat_name not in feature_hours:
        feature_hours[feat_name] = {}
    for role, days in roles.items():
        feature_hours[feat_name][role] = feature_hours[feat_name].get(role, 0) + days

# Check exclusions by proximity to red items
excluded_features = set()
for feat in features:
    fx, fy = feat['x'], feat['y']
    feat_name = feat['content'].split('\n')[0].strip()
    for red in red_feature_positions:
        if abs(red['x'] - fx) < 300 and abs(red['y'] - fy) < 300:
            excluded_features.add(feat_name)
            break

# === OUTPUT RESULTS ===
out = open(r'D:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Couch Heroes\hours_mapping.txt', 'w', encoding='utf-8')

out.write("=== FEATURE HOURS MAPPING ===\n\n")
for feat_name in sorted(feature_hours.keys()):
    excluded = " [NOT FOR VS - EXCLUDED]" if feat_name in excluded_features else ""
    roles = feature_hours[feat_name]
    total = sum(roles.values())
    role_str = ", ".join(f"{r}={d}D" for r, d in sorted(roles.items()))
    line = f"{feat_name}{excluded}: {total}D total | {role_str}"
    out.write(line + "\n")
    print(line)

out.write(f"\n=== SUMMARY ===\n")
out.write(f"Features with estimates: {len(feature_hours)}\n")
out.write(f"Excluded (Not for VS): {len(excluded_features)}\n")
out.write(f"Excluded list: {sorted(excluded_features)}\n")
print(f"\nFeatures with estimates: {len(feature_hours)}")
print(f"Excluded (Not for VS): {len(excluded_features)}")
print(f"Excluded: {sorted(excluded_features)}")

# Unmatched grey boxes
matched_contents = set(m['estimate'] for m in matches)
unmatched = [gb for gb in grey_boxes if gb['content'] not in matched_contents]
out.write(f"\nUnmatched grey boxes: {len(unmatched)}\n")
print(f"\nUnmatched grey boxes: {len(unmatched)}")
for gb in unmatched:
    line = f"  x={gb['x']:.0f} y={gb['y']:.0f} | {gb['content'][:150]}"
    out.write(line + "\n")
    print(line)

out.close()
print("\nResults written to hours_mapping.txt")
