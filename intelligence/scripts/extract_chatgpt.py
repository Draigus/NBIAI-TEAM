#!/usr/bin/env python3
"""
ChatGPT Intelligence Extractor
Filters conversations.json by title relevance, extracts message content
for business-relevant conversations, and writes summary files for
Claude Code to process into intelligence extracts.

Usage:
    python extract_chatgpt.py

Output:
    intelligence/raw/chatgpt/_pending_conversations/
        {id}_{slug}.txt  -- message content for each relevant conversation
    intelligence/raw/chatgpt/_pending_manifest.json  -- metadata for all pending
"""

import json
import re
import os
from datetime import datetime
from pathlib import Path

CONVERSATIONS_PATH = r"D:\OneDrive\CHATGPT HISTORY\conversations.json"
OUTPUT_DIR = Path(r"D:\OneDrive\Claude_code\NBIAI_TEAM\intelligence\raw\chatgpt\_pending_conversations")
MANIFEST_PATH = Path(r"D:\OneDrive\Claude_code\NBIAI_TEAM\intelligence\raw\chatgpt\_pending_manifest.json")

INCLUDE_KEYWORDS = [
    "nbi", "couch heroes", "goals", "lighthouse", "sarge", "playsage", "playsage",
    "pitch", "forecast", "production", "economy", "analysis", "research",
    "strategy", "pricing", "hiring", "salary", "consultant", "consulting",
    "investor", "investment", "valuation", "deck", "proposal", "sow",
    "statement of work", "gtm", "go to market", "game studio",
    "game design", "game development", "live service", "live ops",
    "monetization", "monetisation", "arpu", "ltv", "retention",
    "kpi", "metrics", "analytics", "data room", "due diligence",
    "org design", "org chart", "headcount", "team building",
    "sprint", "milestone", "agile", "production backlog",
    "brand", "website", "seo", "marketing", "linkedin",
    "ai operations", "ai tool", "ai adoption", "claude", "chatgpt",
    "o365", "migration", "sharepoint", "jira", "targetprocess",
    "games industry", "gaming industry", "video game industry",
    "competitor", "competitive", "market", "tam", "sam",
    "revenue", "p&l", "profit", "cost", "budget", "fee",
    "client", "engagement", "advisory", "coaching",
    "foundr", "vgtr", "tax", "ir35", "visa",
]

EXCLUDE_KEYWORDS = [
    "dayz", "stellaris", "bannerlord", "last war", "poe2", "path of exile",
    "bellwright", "farthest frontier", "boom beach",
    "euromillions", "lottery", "jackpot",
    "keto", "omad", "diet", "weight loss", "health",
    "dnd", "d&d", "hularen", "hule", "foundry vtt", "foundry error",
    "battlemap", "worldbook", "varkier", "weirvarn", "gorhund",
    "image request", "image creation", "photorealistic", "midjourney",
    "cinematic", "token", "fantasy city", "fantasy village",
    "new chat", "song", "recipe", "movie", "tv show",
    "weather", "taxi", "sushi", "pizza",
]

def title_is_relevant(title):
    """Check if a conversation title suggests business-relevant content."""
    if not title or title.strip() == "":
        return False

    t = title.lower().strip()

    for kw in EXCLUDE_KEYWORDS:
        if kw in t:
            return False

    for kw in INCLUDE_KEYWORDS:
        if kw in t:
            return True

    return False

def extract_messages(conversation):
    """Extract message text from a conversation's mapping structure."""
    mapping = conversation.get("mapping", {})
    messages = []

    for node_id, node in mapping.items():
        msg = node.get("message")
        if not msg:
            continue
        author = msg.get("author", {}).get("role", "unknown")
        if author not in ("user", "assistant"):
            continue
        content = msg.get("content", {})
        parts = content.get("parts", [])
        text_parts = [p for p in parts if isinstance(p, str) and p.strip()]
        if text_parts:
            text = "\n".join(text_parts)
            create_time = msg.get("create_time")
            messages.append({
                "role": author,
                "text": text,
                "time": create_time
            })

    messages.sort(key=lambda m: m["time"] or 0)
    return messages

def sanitize_slug(title, max_len=60):
    slug = re.sub(r'[^a-zA-Z0-9\s]', '', title)
    slug = re.sub(r'\s+', '_', slug.strip())
    return slug[:max_len].lower().rstrip('_')

def main():
    print(f"Loading {CONVERSATIONS_PATH}...")
    with open(CONVERSATIONS_PATH, "r", encoding="utf-8") as f:
        conversations = json.load(f)

    print(f"Total conversations: {len(conversations)}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    relevant = []
    for conv in conversations:
        title = conv.get("title", "")
        if title_is_relevant(title):
            relevant.append(conv)

    print(f"Relevant conversations (title filter): {len(relevant)}")

    manifest = []
    for conv in relevant:
        title = conv.get("title", "Untitled")
        conv_id = conv.get("id", conv.get("conversation_id", "unknown"))
        create_time = conv.get("create_time", 0)
        update_time = conv.get("update_time", 0)

        try:
            date_str = datetime.fromtimestamp(create_time).strftime("%Y-%m-%d") if create_time else "unknown"
        except (ValueError, OSError):
            date_str = "unknown"

        messages = extract_messages(conv)
        if not messages:
            continue

        slug = sanitize_slug(title)
        filename = f"{conv_id[:12]}_{slug}.txt"
        filepath = OUTPUT_DIR / filename

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"TITLE: {title}\n")
            f.write(f"DATE: {date_str}\n")
            f.write(f"MESSAGES: {len(messages)}\n")
            f.write(f"ID: {conv_id}\n")
            f.write("---\n\n")
            for msg in messages:
                role_label = "USER" if msg["role"] == "user" else "ASSISTANT"
                f.write(f"[{role_label}]\n{msg['text']}\n\n")

        user_messages = [m for m in messages if m["role"] == "user"]
        manifest.append({
            "id": conv_id,
            "title": title,
            "date": date_str,
            "messages": len(messages),
            "user_messages": len(user_messages),
            "filename": filename,
        })

    manifest.sort(key=lambda x: x["date"], reverse=True)

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"Extracted {len(manifest)} conversations to {OUTPUT_DIR}")
    print(f"Manifest written to {MANIFEST_PATH}")

    by_keyword = {}
    for item in manifest:
        t = item["title"].lower()
        for kw in ["pitch", "forecast", "production", "sarge", "playsage",
                    "nbi", "couch heroes", "lighthouse", "hiring", "salary",
                    "investor", "gtm", "strategy", "consulting"]:
            if kw in t:
                by_keyword.setdefault(kw, 0)
                by_keyword[kw] += 1

    print("\nTop keyword matches:")
    for kw, count in sorted(by_keyword.items(), key=lambda x: -x[1]):
        print(f"  {kw}: {count}")

if __name__ == "__main__":
    main()
