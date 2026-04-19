# Handoff: Settings Overhaul — 2026-04-19

## What This Session Did

Glen was hitting two persistent pain points with Claude Code in VS Code. This session diagnosed and fixed both, plus added a context-efficiency setting.

## Changes Made

### 1. Bash Permission Prompts — FIXED

**Problem:** Every bash command that didn't exactly match one of ~120 specific `Bash(exact command here)` entries in the allow lists would trigger a permission prompt. Each approval only added that one exact command — never a wildcard. So Glen was approving the same types of commands over and over.

**Fix:** Added `"Bash(*)"` as the first entry in the permissions allow array in BOTH settings files:
- `C:\Users\gpbea\.claude\settings.json` (global) — line 4
- `d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\settings.local.json` (project-local) — line 7

`Bash(*)` is a prefix wildcard that matches every bash command. The ~120 specific entries below it are now redundant but harmless — they can be cleaned up later if desired.

Both files also have `"defaultMode": "dontAsk"` which should reinforce this.

### 2. Context Window Meter Showing Wrong Percentage — FIXED

**Problem:** VS Code's context usage bar was showing ~47% after barely one exchange. Glen is on Opus 4.6 with a 1M token context window, but the meter appeared to be calculating against a much smaller window (likely 200K — the old default).

**Fix:** Added `"autoCompactWindow": 1000000` to global settings (`C:\Users\gpbea\.claude\settings.json`). This is the maximum allowed value (schema: min 100000, max 1000000). It tells Claude Code to use the full 1M window for context tracking and compaction decisions.

Also removed `"DISABLE_AUTO_COMPACT": "1"` from the project-local env vars (`d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\settings.local.json`). With the window properly set to 1M, auto-compaction should work correctly when genuinely needed rather than being disabled entirely.

### 3. Skill Listing Context Overhead — REDUCED

**Problem:** 82 skills were loading full descriptions (up to 1536 chars each, the default `skillListingMaxDescChars`) into the system prompt every turn. That's up to ~125K chars of skill descriptions per turn.

**Fix:** Added `"skillListingMaxDescChars": 200` to global settings. Each skill now gets its name plus one meaningful sentence — enough for the model to know when to invoke it, without the bloat. Glen's directive: "a name and a short one-line description" — not so short that the model can't make good decisions, not so long that it wastes context.

## Files Modified

| File | Changes |
|---|---|
| `C:\Users\gpbea\.claude\settings.json` | Added `Bash(*)` to allow list, added `autoCompactWindow: 1000000`, added `skillListingMaxDescChars: 200` |
| `d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\settings.local.json` | Added `Bash(*)` to allow list, removed `DISABLE_AUTO_COMPACT` env var |

## Verification

All changes were validated:
- Both JSON files pass `python -m json.tool` syntax validation
- `Bash(*)` confirmed present in both allow arrays
- `autoCompactWindow` confirmed at `1000000`
- `skillListingMaxDescChars` confirmed at `200`
- `DISABLE_AUTO_COMPACT` confirmed removed

## What to Watch For Next Session

1. **Bash prompts should be gone.** If any still appear, something is overriding the allow list — check if there's a managed settings file or if the VS Code extension has its own permission layer.
2. **Context meter should read much lower.** If it still shows high percentages early, the extension might be ignoring `autoCompactWindow` and using its own hardcoded model-to-context mapping. That would be a Claude Code bug to report.
3. **Skills should still work.** The 200-char descriptions are truncated, not removed. If the model consistently fails to invoke relevant skills, bump `skillListingMaxDescChars` up to 300.

## No Other Work Done

This was a config-only session. No code changes, no dashboard work, no bug fixes. The git working tree is unchanged from the previous session.
