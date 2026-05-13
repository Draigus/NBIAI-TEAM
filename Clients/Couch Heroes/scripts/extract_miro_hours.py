"""
Extract man-day/hour estimates from Miro board JSON exports and match to game features.
Couch Heroes vertical slice work plan.
"""
import json
import re
import os
from html.parser import HTMLParser
from collections import defaultdict

# ── File paths ──────────────────────────────────────────────────────────
BASE = r"C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI-TEAM\d41e7002-7785-4c2a-ba67-02f379183b49\tool-results"

STICKY_FILES = [
    os.path.join(BASE, "mcp-claude_ai_Miro-board_list_items-1777998158578.txt"),
]

SHAPE_FILES = [
    os.path.join(BASE, "mcp-claude_ai_Miro-board_list_items-1777998367328.txt"),
    os.path.join(BASE, "mcp-claude_ai_Miro-board_list_items-1777998983493.txt"),
    os.path.join(BASE, "mcp-claude_ai_Miro-board_list_items-1777998996501.txt"),
    os.path.join(BASE, "mcp-claude_ai_Miro-board_list_items-1777999013112.txt"),
]

TEXT_FILES = [
    os.path.join(BASE, "mcp-claude_ai_Miro-board_list_items-1777998375179.txt"),
]

OUTPUT = r"D:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Couch Heroes\miro_hours_extract.txt"


# ── HTML stripper ───────────────────────────────────────────────────────
class HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
    def handle_data(self, d):
        self.parts.append(d)
    def handle_entityref(self, name):
        from html import unescape
        self.parts.append(unescape(f"&{name};"))
    def handle_charref(self, name):
        from html import unescape
        self.parts.append(unescape(f"&#{name};"))
    def get_text(self):
        return " ".join(self.parts).strip()

def strip_html(html_str):
    if not html_str:
        return ""
    # Also decode HTML entities that might be double-encoded
    html_str = html_str.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").replace("&#43;", "+")
    s = HTMLStripper()
    s.feed(html_str)
    return s.get_text()


# ── Load all items ──────────────────────────────────────────────────────
def load_items(file_paths, label):
    items = []
    for fp in file_paths:
        print(f"  Loading {label}: {os.path.basename(fp)} ...", end=" ")
        with open(fp, "r", encoding="utf-8") as f:
            raw = f.read()
        data = json.loads(raw)
        batch = data.get("data", [])
        print(f"{len(batch)} items")
        items.extend(batch)
    return items

print("Loading files...")
stickies_raw = load_items(STICKY_FILES, "stickies")
shapes_raw   = load_items(SHAPE_FILES, "shapes")
texts_raw    = load_items(TEXT_FILES, "text")

print(f"\nTotals: {len(stickies_raw)} stickies, {len(shapes_raw)} shapes, {len(texts_raw)} text items")


# ── Normalise items ─────────────────────────────────────────────────────
def normalise(item, source_type):
    """Extract uniform fields from any Miro item."""
    content_html = ""
    if "data" in item and isinstance(item["data"], dict):
        content_html = item["data"].get("content", "")
    content = strip_html(content_html)

    pos = item.get("position", {})
    x = pos.get("x")
    y = pos.get("y")
    relative_to = pos.get("relativeTo", "")

    geo = item.get("geometry", {})
    w = geo.get("width")
    h = geo.get("height")

    style = item.get("style") or {}
    fill = style.get("fillColor", "")
    fill_opacity = style.get("fillOpacity", "")
    border_color = style.get("borderColor", "")
    font_color = style.get("color", "")

    parent_id = None
    if item.get("parent") and isinstance(item["parent"], dict):
        parent_id = item["parent"].get("id")

    return {
        "id": item.get("id", ""),
        "type": item.get("type", ""),
        "source": source_type,
        "content_html": content_html,
        "content": content,
        "x": x,
        "y": y,
        "relative_to": relative_to,
        "width": w,
        "height": h,
        "fill": fill,
        "fill_opacity": fill_opacity,
        "border_color": border_color,
        "font_color": font_color,
        "parent_id": parent_id,
        "miro_url": item.get("miro_url", ""),
    }

all_items = []
for it in stickies_raw:
    all_items.append(normalise(it, "sticky"))
for it in shapes_raw:
    all_items.append(normalise(it, "shape"))
for it in texts_raw:
    all_items.append(normalise(it, "text"))

print(f"Normalised {len(all_items)} total items")


# ── Detect numeric / estimate items ────────────────────────────────────
# Patterns: pure numbers, "Xd", "X days", "X hrs", "X hours", "X MD", "X man-days",
# discipline breakdowns like "Concept 15 - props 40d - layout 50d"
NUMBER_RE = re.compile(
    r'(?:^|\s|[:\-])(\d+(?:\.\d+)?)\s*'
    r'(?:d\b|days?|hrs?|hours?|MD|man[- ]?days?|h\b|$)',
    re.IGNORECASE
)
# Also match bare numbers (entire content is just a number)
BARE_NUMBER_RE = re.compile(r'^\s*(\d+(?:\.\d+)?)\s*$')
# Match any content that has at least one digit
HAS_DIGIT_RE = re.compile(r'\d')

GREY_COLORS = {
    "#808080", "#c0c0c0", "#d3d3d3", "#a9a9a9", "#e6e6e6", "#f5f5f5",
    "#cccccc", "#999999", "#b0b0b0", "#d9d9d9", "#ebebeb", "#f0f0f0",
    "#e0e0e0", "#bfbfbf", "#c4c4c4", "#d5d5d5", "#9b9b9b", "#a0a0a0",
    "#b3b3b3", "#c6c6c6", "#dcdcdc", "#ededed", "#f2f2f2", "#fafafa",
    "gray", "grey", "light_gray", "light_grey", "#e8e8e8",
    "#1a1a1a",  # dark grey text
}

RED_COLORS = {
    "red", "#ff0000", "#ff3333", "#e74c3c", "#c0392b", "#ff4444",
    "#e6261f", "#eb5757", "#f24726", "#da3b01", "#d32f2f", "#b71c1c",
    "#ff1744", "#d50000",
}

def is_grey(fill_str):
    if not fill_str:
        return False
    f = fill_str.lower().strip()
    if f in GREY_COLORS:
        return True
    # Check if hex and in grey range (R≈G≈B, all > 0x80)
    m = re.match(r'^#([0-9a-f]{6})$', f)
    if m:
        r_, g_, b_ = int(m.group(1)[:2], 16), int(m.group(1)[2:4], 16), int(m.group(1)[4:], 16)
        spread = max(r_, g_, b_) - min(r_, g_, b_)
        avg = (r_ + g_ + b_) / 3
        if spread < 30 and avg > 100:  # nearly equal channels, not too dark
            return True
    return False

def is_red(fill_str):
    if not fill_str:
        return False
    f = fill_str.lower().strip()
    if f in RED_COLORS:
        return True
    m = re.match(r'^#([0-9a-f]{6})$', f)
    if m:
        r_, g_, b_ = int(m.group(1)[:2], 16), int(m.group(1)[2:4], 16), int(m.group(1)[4:], 16)
        if r_ > 180 and g_ < 100 and b_ < 100:
            return True
    return False

def extract_numbers(text):
    """Extract all numeric values from text, return list of (number, unit_context)."""
    results = []
    # Try structured matches first
    for m in NUMBER_RE.finditer(text):
        num = float(m.group(1))
        context = text[m.start():m.end()].strip()
        results.append((num, context))
    # Also try bare number
    bm = BARE_NUMBER_RE.match(text)
    if bm and not results:
        results.append((float(bm.group(1)), "bare"))
    return results

# Classify items
numeric_items = []
feature_cards = []
exclusion_markers = []
all_with_pos = []  # items that have canvas-relative positions

for it in all_items:
    # Skip items with parent-relative positions for spatial matching
    # (they're inside frames and their x/y is relative to parent)
    has_canvas_pos = it["relative_to"] == "canvas_center" and it["x"] is not None

    if has_canvas_pos:
        all_with_pos.append(it)

    content = it["content"]
    if not content:
        continue

    # Check for exclusion markers
    content_lower = content.lower()
    if "not for vs" in content_lower or "not for vertical slice" in content_lower or "exclude" in content_lower:
        exclusion_markers.append(it)

    # Check for red items (potential exclusion markers even without text)
    if is_red(it["fill"]):
        exclusion_markers.append(it)

    # Check for numeric content
    if HAS_DIGIT_RE.search(content):
        nums = extract_numbers(content)
        if nums:
            it["extracted_numbers"] = nums
            it["is_grey"] = is_grey(it["fill"])
            numeric_items.append(it)

    # Feature cards: sticky notes with non-grey, non-red fills that have meaningful text
    # and are in the feature map area
    if it["source"] == "sticky" and content and len(content) > 2:
        if not is_grey(it["fill"]) and not is_red(it["fill"]):
            fill = it["fill"].lower() if it["fill"] else ""
            if fill not in ("", "transparent", "#ffffff", "white"):
                feature_cards.append(it)

# Also treat coloured shapes with meaningful text as potential feature cards
for it in all_items:
    if it["source"] == "shape" and it["content"] and len(it["content"]) > 2:
        if not is_grey(it["fill"]) and not is_red(it["fill"]):
            fill = it["fill"].lower() if it["fill"] else ""
            if fill not in ("", "transparent", "#ffffff", "white", "#1a1a1a"):
                # Don't double-add
                if not any(f["id"] == it["id"] for f in feature_cards):
                    feature_cards.append(it)

print(f"\nFound {len(numeric_items)} items with numbers")
print(f"Found {len(feature_cards)} potential feature cards")
print(f"Found {len(exclusion_markers)} exclusion markers")
print(f"Found {len(all_with_pos)} items with canvas-relative positions")


# ── Spatial matching ────────────────────────────────────────────────────
# For items with canvas_center positions, we can do spatial matching.
# For items with parent-relative positions, we need to find their parent's position first.

# Build parent position lookup
parent_positions = {}
for it in all_items:
    if it["relative_to"] == "canvas_center" and it["x"] is not None:
        parent_positions[it["id"]] = (it["x"], it["y"])

def get_canvas_pos(item):
    """Get canvas-absolute position for an item."""
    if item["relative_to"] == "canvas_center" and item["x"] is not None:
        return (item["x"], item["y"])
    if item["parent_id"] and item["parent_id"] in parent_positions:
        px, py = parent_positions[item["parent_id"]]
        if item["x"] is not None:
            return (px + item["x"], py + item["y"])
    return None

# Recalculate canvas positions for all relevant items
for it in numeric_items + feature_cards + exclusion_markers:
    it["canvas_pos"] = get_canvas_pos(it)

# Filter to items with known positions
numeric_with_pos = [it for it in numeric_items if it["canvas_pos"]]
features_with_pos = [it for it in feature_cards if it["canvas_pos"]]
exclusions_with_pos = [it for it in exclusion_markers if it["canvas_pos"]]

print(f"\nWith canvas positions: {len(numeric_with_pos)} numeric, {len(features_with_pos)} features, {len(exclusions_with_pos)} exclusions")


# ── Identify epic rows and feature columns ──────────────────────────────
# Group feature cards by Y position (rows = epics) and X position (columns = features)
# Use clustering: items within 200px Y are same row

def cluster_values(values, threshold):
    """Cluster numeric values that are within threshold of each other."""
    if not values:
        return []
    sorted_vals = sorted(set(values))
    clusters = [[sorted_vals[0]]]
    for v in sorted_vals[1:]:
        if v - clusters[-1][-1] <= threshold:
            clusters[-1].append(v)
        else:
            clusters.append([v])
    return [(sum(c)/len(c), min(c), max(c)) for c in clusters]


# ── Match numeric items to nearest feature ──────────────────────────────
def find_nearest_feature(num_item, features, max_x_dist=400, max_y_dist=800):
    """Find the nearest feature card to a numeric item, preferring X-alignment."""
    nx, ny = num_item["canvas_pos"]
    best = None
    best_dist = float('inf')
    for feat in features:
        fx, fy = feat["canvas_pos"]
        dx = abs(fx - nx)
        dy = abs(fy - ny)
        if dx > max_x_dist:
            continue
        # Weighted distance: X alignment matters more
        dist = dx * 2 + dy
        if dist < best_dist:
            best_dist = dist
            best = feat
    return best, best_dist

matches = []
for num_item in numeric_with_pos:
    nearest, dist = find_nearest_feature(num_item, features_with_pos)
    if nearest:
        nx, ny = num_item["canvas_pos"]
        fx, fy = nearest["canvas_pos"]
        position = "ABOVE" if ny < fy else "BELOW" if ny > fy else "SAME"
        matches.append({
            "numeric_item": num_item,
            "feature": nearest,
            "distance": dist,
            "position": position,
            "y_diff": ny - fy,
        })


# ── Check exclusions per feature ────────────────────────────────────────
def is_feature_excluded(feat, exclusions, max_dist=500):
    """Check if any exclusion marker is near this feature."""
    if not feat["canvas_pos"]:
        return False
    fx, fy = feat["canvas_pos"]
    for ex in exclusions:
        if not ex["canvas_pos"]:
            continue
        ex_x, ex_y = ex["canvas_pos"]
        if abs(ex_x - fx) < max_dist and abs(ex_y - fy) < max_dist:
            return True
    return False


# ── Collect color distribution for analysis ─────────────────────────────
color_counts = defaultdict(int)
for it in all_items:
    if it["fill"]:
        color_counts[it["fill"]] += 1


# ── Build epic groupings ───────────────────────────────────────────────
# Try to identify text items or shapes that serve as epic/row labels
epic_labels = []
for it in all_items:
    content = it["content"]
    if not content:
        continue
    content_lower = content.lower()
    # Epic labels are typically large text or specially coloured shapes
    # Look for known epic-like terms
    epic_keywords = [
        "core gameplay", "combat", "progression", "social", "meta",
        "ui/ux", "audio", "art", "backend", "infrastructure",
        "multiplayer", "economy", "monetization", "monetisation",
        "onboarding", "tutorial", "world", "exploration", "crafting",
        "pvp", "pve", "guild", "clan", "trading", "quest", "narrative",
        "live ops", "liveops", "analytics", "metagame", "character",
        "hero", "skill", "ability", "weapon", "item", "inventory",
        "matchmaking", "lobby", "shop", "store", "gacha", "battle pass",
        "season", "event", "achievement", "leaderboard", "ranking",
        "customization", "customisation", "cosmetic", "skin",
    ]
    # Don't filter too aggressively - just collect candidates
    pos = get_canvas_pos(it)
    if pos:
        epic_labels.append({**it, "canvas_pos": pos})


# ── Write output ────────────────────────────────────────────────────────
print(f"\nWriting output to {OUTPUT} ...")

with open(OUTPUT, "w", encoding="utf-8") as out:
    out.write("=" * 120 + "\n")
    out.write("COUCH HEROES - MIRO BOARD HOURS EXTRACTION\n")
    out.write(f"Generated: 2026-05-05\n")
    out.write(f"Total items processed: {len(all_items)}\n")
    out.write("=" * 120 + "\n\n")

    # ── SECTION 0: Color distribution ───────────────────────────────
    out.write("=" * 120 + "\n")
    out.write("SECTION 0: COLOR DISTRIBUTION (top 50 fill colours)\n")
    out.write("=" * 120 + "\n\n")
    for color, count in sorted(color_counts.items(), key=lambda x: -x[1])[:50]:
        grey_tag = " [GREY]" if is_grey(color) else ""
        red_tag = " [RED]" if is_red(color) else ""
        out.write(f"  {color:30s}  count={count:5d}{grey_tag}{red_tag}\n")
    out.write("\n\n")

    # ── SECTION 1: All numeric items ────────────────────────────────
    out.write("=" * 120 + "\n")
    out.write("SECTION 1: ALL ITEMS CONTAINING NUMERIC VALUES\n")
    out.write(f"({len(numeric_items)} items found)\n")
    out.write("=" * 120 + "\n\n")

    # Sort by Y then X for spatial readability
    def sort_key(it):
        p = it.get("canvas_pos")
        if p:
            return (p[1], p[0])
        return (999999, 999999)

    for it in sorted(numeric_items, key=sort_key):
        pos_str = ""
        if it["canvas_pos"]:
            pos_str = f"canvas({it['canvas_pos'][0]:.0f}, {it['canvas_pos'][1]:.0f})"
        elif it["x"] is not None:
            pos_str = f"relative({it['x']:.0f}, {it['y']:.0f}) parent={it['parent_id']}"
        else:
            pos_str = "NO POSITION"

        dim_str = ""
        if it["width"]:
            dim_str = f"{it['width']:.0f}x{it['height']:.0f}" if it["height"] else f"w={it['width']:.0f}"

        nums_str = ", ".join(f"{n[0]}({n[1]})" for n in it.get("extracted_numbers", []))

        grey_tag = " [GREY]" if it["is_grey"] else ""
        out.write(f"  ID: {it['id']}\n")
        out.write(f"  Type: {it['type']} ({it['source']})\n")
        out.write(f"  Content: {it['content']}\n")
        out.write(f"  Fill: {it['fill']}{grey_tag}  |  Border: {it['border_color']}  |  FontColor: {it['font_color']}\n")
        out.write(f"  Position: {pos_str}  |  Size: {dim_str}\n")
        out.write(f"  Numbers: {nums_str}\n")
        out.write(f"  ---\n")

    out.write("\n\n")

    # ── SECTION 2: Feature cards ────────────────────────────────────
    out.write("=" * 120 + "\n")
    out.write("SECTION 2: FEATURE CARDS WITH POSITIONS\n")
    out.write(f"({len(feature_cards)} items found)\n")
    out.write("=" * 120 + "\n\n")

    for it in sorted(feature_cards, key=sort_key):
        pos_str = ""
        cp = it.get("canvas_pos") or get_canvas_pos(it)
        if cp:
            pos_str = f"canvas({cp[0]:.0f}, {cp[1]:.0f})"
        elif it["x"] is not None:
            pos_str = f"relative({it['x']:.0f}, {it['y']:.0f}) parent={it['parent_id']}"
        else:
            pos_str = "NO POSITION"

        dim_str = ""
        if it["width"]:
            dim_str = f"{it['width']:.0f}x{it['height']:.0f}" if it["height"] else f"w={it['width']:.0f}"

        out.write(f"  ID: {it['id']}\n")
        out.write(f"  Content: {it['content']}\n")
        out.write(f"  Fill: {it['fill']}  |  Type: {it['type']} ({it['source']})\n")
        out.write(f"  Position: {pos_str}  |  Size: {dim_str}\n")
        out.write(f"  ---\n")

    out.write("\n\n")

    # ── SECTION 3: Exclusion markers ────────────────────────────────
    out.write("=" * 120 + "\n")
    out.write("SECTION 3: 'NOT FOR VS' / RED EXCLUSION MARKERS\n")
    out.write(f"({len(exclusion_markers)} items found)\n")
    out.write("=" * 120 + "\n\n")

    for it in sorted(exclusion_markers, key=sort_key):
        pos_str = ""
        cp = it.get("canvas_pos") or get_canvas_pos(it)
        if cp:
            pos_str = f"canvas({cp[0]:.0f}, {cp[1]:.0f})"
        elif it["x"] is not None:
            pos_str = f"relative({it['x']:.0f}, {it['y']:.0f}) parent={it['parent_id']}"
        else:
            pos_str = "NO POSITION"

        out.write(f"  ID: {it['id']}\n")
        out.write(f"  Content: {it['content']}\n")
        out.write(f"  Fill: {it['fill']}  |  Type: {it['type']}\n")
        out.write(f"  Position: {pos_str}\n")
        out.write(f"  ---\n")

    out.write("\n\n")

    # ── SECTION 4: Matched results ──────────────────────────────────
    out.write("=" * 120 + "\n")
    out.write("SECTION 4: MATCHED RESULTS - NUMERIC ITEMS TO FEATURES\n")
    out.write(f"({len(matches)} matches found)\n")
    out.write("=" * 120 + "\n\n")

    # Group matches by feature
    by_feature = defaultdict(list)
    for m in matches:
        feat_id = m["feature"]["id"]
        by_feature[feat_id].append(m)

    # Build feature summary table
    feature_summaries = []
    for feat_id, feat_matches in by_feature.items():
        feat = feat_matches[0]["feature"]
        above_items = [m for m in feat_matches if m["position"] == "ABOVE"]
        below_items = [m for m in feat_matches if m["position"] == "BELOW"]
        same_items = [m for m in feat_matches if m["position"] == "SAME"]

        above_hours = []
        for m in above_items:
            for n, ctx in m["numeric_item"].get("extracted_numbers", []):
                above_hours.append((n, ctx, m["numeric_item"]["content"]))

        below_hours = []
        for m in below_items:
            for n, ctx in m["numeric_item"].get("extracted_numbers", []):
                below_hours.append((n, ctx, m["numeric_item"]["content"]))

        same_hours = []
        for m in same_items:
            for n, ctx in m["numeric_item"].get("extracted_numbers", []):
                same_hours.append((n, ctx, m["numeric_item"]["content"]))

        excluded = is_feature_excluded(feat, exclusions_with_pos)

        feature_summaries.append({
            "feature": feat["content"],
            "fill": feat["fill"],
            "pos": feat.get("canvas_pos"),
            "above": above_hours,
            "below": below_hours,
            "same": same_hours,
            "excluded": excluded,
            "matches": feat_matches,
        })

    # Sort by position
    feature_summaries.sort(key=lambda s: (s["pos"][1] if s["pos"] else 999999, s["pos"][0] if s["pos"] else 999999))

    # Detailed per-feature output
    for fs in feature_summaries:
        excl_tag = " [EXCLUDED - NOT FOR VS]" if fs["excluded"] else ""
        out.write(f"  FEATURE: {fs['feature']}{excl_tag}\n")
        out.write(f"  Fill: {fs['fill']}  |  Position: ({fs['pos'][0]:.0f}, {fs['pos'][1]:.0f})\n" if fs["pos"] else "")

        if fs["above"]:
            out.write(f"  ABOVE (feature-level hours):\n")
            for n, ctx, full_content in fs["above"]:
                out.write(f"    {n} ({ctx}) -- from: \"{full_content}\"\n")

        if fs["below"]:
            out.write(f"  BELOW (story-level hours):\n")
            for n, ctx, full_content in fs["below"]:
                out.write(f"    {n} ({ctx}) -- from: \"{full_content}\"\n")

        if fs["same"]:
            out.write(f"  SAME Y (co-located):\n")
            for n, ctx, full_content in fs["same"]:
                out.write(f"    {n} ({ctx}) -- from: \"{full_content}\"\n")

        out.write(f"  ---\n\n")

    # ── SECTION 5: Summary table ────────────────────────────────────
    out.write("\n" + "=" * 120 + "\n")
    out.write("SECTION 5: SUMMARY TABLE\n")
    out.write("=" * 120 + "\n\n")

    header = f"{'Feature':<60} | {'Above (Feature Hrs)':<30} | {'Below (Story Hrs)':<30} | {'Excluded?':<10}"
    out.write(header + "\n")
    out.write("-" * len(header) + "\n")

    for fs in feature_summaries:
        above_str = ", ".join(f"{n}" for n, _, _ in fs["above"]) if fs["above"] else "-"
        below_str = ", ".join(f"{n}" for n, _, _ in fs["below"]) if fs["below"] else "-"
        excl_str = "YES" if fs["excluded"] else "no"
        feat_name = fs["feature"][:58]
        out.write(f"{feat_name:<60} | {above_str:<30} | {below_str:<30} | {excl_str:<10}\n")

    # ── SECTION 6: Unmatched numeric items ──────────────────────────
    matched_ids = set()
    for m in matches:
        matched_ids.add(m["numeric_item"]["id"])

    unmatched = [it for it in numeric_items if it["id"] not in matched_ids]
    out.write("\n\n" + "=" * 120 + "\n")
    out.write(f"SECTION 6: UNMATCHED NUMERIC ITEMS (no feature within range)\n")
    out.write(f"({len(unmatched)} items)\n")
    out.write("=" * 120 + "\n\n")

    for it in sorted(unmatched, key=sort_key):
        pos_str = ""
        cp = it.get("canvas_pos")
        if cp:
            pos_str = f"canvas({cp[0]:.0f}, {cp[1]:.0f})"
        elif it["x"] is not None:
            pos_str = f"relative({it['x']:.0f}, {it['y']:.0f}) parent={it['parent_id']}"
        else:
            pos_str = "NO POSITION"

        nums_str = ", ".join(f"{n[0]}({n[1]})" for n in it.get("extracted_numbers", []))
        grey_tag = " [GREY]" if it["is_grey"] else ""

        out.write(f"  ID: {it['id']}\n")
        out.write(f"  Content: {it['content']}\n")
        out.write(f"  Fill: {it['fill']}{grey_tag}  |  Type: {it['type']}\n")
        out.write(f"  Position: {pos_str}\n")
        out.write(f"  Numbers: {nums_str}\n")
        out.write(f"  ---\n")

    # ── SECTION 7: Grey items specifically ──────────────────────────
    grey_items = [it for it in all_items if is_grey(it["fill"]) and it["content"]]
    out.write("\n\n" + "=" * 120 + "\n")
    out.write(f"SECTION 7: ALL GREY-FILLED ITEMS WITH CONTENT\n")
    out.write(f"({len(grey_items)} items)\n")
    out.write("=" * 120 + "\n\n")

    for it in sorted(grey_items, key=lambda x: (get_canvas_pos(x) or (999999, 999999))[1]):
        cp = get_canvas_pos(it)
        pos_str = f"canvas({cp[0]:.0f}, {cp[1]:.0f})" if cp else "NO CANVAS POS"
        dim_str = ""
        if it["width"]:
            dim_str = f"{it['width']:.0f}x{it['height']:.0f}" if it["height"] else f"w={it['width']:.0f}"
        has_num = "[HAS NUMBER]" if HAS_DIGIT_RE.search(it["content"]) else ""

        out.write(f"  ID: {it['id']}  |  Fill: {it['fill']}  |  Type: {it['type']}\n")
        out.write(f"  Content: {it['content']} {has_num}\n")
        out.write(f"  Position: {pos_str}  |  Size: {dim_str}\n")
        out.write(f"  ---\n")

    # ── SECTION 8: Position ranges analysis ─────────────────────────
    out.write("\n\n" + "=" * 120 + "\n")
    out.write("SECTION 8: POSITION RANGES ANALYSIS\n")
    out.write("=" * 120 + "\n\n")

    canvas_items = [it for it in all_items if it["relative_to"] == "canvas_center" and it["x"] is not None]
    if canvas_items:
        xs = [it["x"] for it in canvas_items]
        ys = [it["y"] for it in canvas_items]
        out.write(f"Canvas-relative items: {len(canvas_items)}\n")
        out.write(f"X range: {min(xs):.0f} to {max(xs):.0f}\n")
        out.write(f"Y range: {min(ys):.0f} to {max(ys):.0f}\n\n")

    # Y-band analysis: where are dense clusters of items?
    y_bands = defaultdict(int)
    for it in canvas_items:
        band = int(it["y"] // 1000) * 1000
        y_bands[band] += 1

    out.write("Y-band density (items per 1000px band):\n")
    for band in sorted(y_bands.keys()):
        bar = "#" * min(y_bands[band] // 5, 80)
        out.write(f"  Y {band:>8} to {band+1000:>8}: {y_bands[band]:>5} items  {bar}\n")

    out.write("\n\n")

    # ── SECTION 9: Items with "d" unit (likely day estimates) ───────
    day_pattern = re.compile(r'(\d+(?:\.\d+)?)\s*d\b', re.IGNORECASE)
    day_items = []
    for it in all_items:
        if it["content"] and day_pattern.search(it["content"]):
            day_items.append(it)

    out.write("=" * 120 + "\n")
    out.write(f"SECTION 9: ITEMS WITH 'd' UNIT (likely day estimates)\n")
    out.write(f"({len(day_items)} items)\n")
    out.write("=" * 120 + "\n\n")

    for it in sorted(day_items, key=lambda x: (get_canvas_pos(x) or (999999, 999999))[1]):
        cp = get_canvas_pos(it)
        pos_str = f"canvas({cp[0]:.0f}, {cp[1]:.0f})" if cp else "NO CANVAS POS"
        out.write(f"  Content: {it['content']}\n")
        out.write(f"  Fill: {it['fill']}  |  Type: {it['type']}  |  Position: {pos_str}\n")
        out.write(f"  ---\n")

print("DONE.")
print(f"Output written to: {OUTPUT}")
